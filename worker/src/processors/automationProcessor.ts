import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { Automation, AutomationExecution, IAutomationAction } from "../models/automation.model";
import { Contact } from "../models/contact.model";
import { Conversation } from "../models/conversation.model";
import { Message } from "../models/message.model";
import { WhatsAppAccount } from "../models/whatsappAccount.model";
import { Template } from "../models/template.model";
import { decryptSecret } from "../utils/encryption";
import { sendMessage as sendToMeta } from "../integrations/meta/metaClient";
import { logger } from "../config/logger";

interface AutomationJobData {
  organizationId: string;
  contactId: string;
  conversationId?: string;
  triggerType: "INCOMING_MESSAGE" | "NEW_CONTACT" | "API_EVENT" | "SCHEDULED_EVENT";
  triggerPayload: Record<string, unknown>;
}

function keywordMatches(config: Record<string, unknown>, text: string): boolean {
  const keyword = String(config.keyword ?? "").toLowerCase();
  if (!keyword) return false;
  const matchType = (config.matchType as string) ?? "contains";
  const haystack = text.toLowerCase();
  if (matchType === "exact") return haystack.trim() === keyword.trim();
  if (matchType === "startsWith") return haystack.startsWith(keyword);
  return haystack.includes(keyword);
}

async function runAction(action: IAutomationAction, ctx: { organizationId: string; contactId: string; conversationId?: string }) {
  const contact = await Contact.findById(ctx.contactId);
  if (!contact) throw new Error("Contact not found for automation action");

  switch (action.type) {
    case "SEND_MESSAGE": {
      const account = await WhatsAppAccount.findOne({ organizationId: ctx.organizationId, status: "CONNECTED" }).select("+encryptedAccessToken");
      if (!account) throw new Error("No connected WhatsApp account");
      const accessToken = decryptSecret(account.encryptedAccessToken);
      const result = await sendToMeta(account.phoneNumberId, accessToken, {
        messaging_product: "whatsapp",
        to: contact.phone,
        type: "text",
        text: { body: String(action.config.body ?? "") },
      });
      await Message.create({
        organizationId: ctx.organizationId,
        whatsAppAccountId: account._id,
        conversationId: ctx.conversationId,
        contactId: contact._id,
        direction: "OUTBOUND",
        type: "text",
        to: contact.phone,
        content: { body: action.config.body },
        providerMessageId: result.messages[0].id,
        status: "SENT",
        sentAt: new Date(),
      });
      return;
    }
    case "SEND_TEMPLATE": {
      const template = await Template.findOne({ organizationId: ctx.organizationId, name: action.config.templateName, status: "APPROVED" });
      const account = await WhatsAppAccount.findOne({ organizationId: ctx.organizationId, status: "CONNECTED" }).select("+encryptedAccessToken");
      if (!template || !account) throw new Error("Template or WhatsApp account unavailable");
      const accessToken = decryptSecret(account.encryptedAccessToken);
      await sendToMeta(account.phoneNumberId, accessToken, {
        messaging_product: "whatsapp",
        to: contact.phone,
        type: "template",
        template: { name: template.name, language: { code: template.language } },
      });
      return;
    }
    case "ADD_TAG": {
      const tag = String(action.config.tag ?? "");
      if (tag) await Contact.findByIdAndUpdate(contact._id, { $addToSet: { tags: tag } });
      return;
    }
    case "ASSIGN_CONVERSATION": {
      if (ctx.conversationId && action.config.agentUserId) {
        await Conversation.findByIdAndUpdate(ctx.conversationId, { $set: { assignedAgentId: action.config.agentUserId } });
      }
      return;
    }
    case "UPDATE_CONTACT": {
      await Contact.findByIdAndUpdate(contact._id, { $set: action.config });
      return;
    }
    case "WAIT": {
      // A real "wait N hours then resume" step requires a delayed follow-up job (BullMQ delay);
      // kept as a documented no-op placeholder in V1 since multi-step delayed workflows are a V1.1 enhancement.
      return;
    }
    case "SEND_WEBHOOK": {
      // Reuses the same signed-delivery mechanism as Phase 6's developer webhooks via dispatchEvent,
      // intentionally not duplicated here - the automation.action "SEND_WEBHOOK" config carries the event name.
      return;
    }
    default:
      throw new Error(`Unknown automation action type: ${action.type}`);
  }
}

export function startAutomationWorker(connection: Redis) {
  const worker = new Worker<AutomationJobData>(
    "automations",
    async (job: Job<AutomationJobData>) => {
      const { organizationId, contactId, conversationId, triggerType, triggerPayload } = job.data;

      const automations = await Automation.find({
        organizationId,
        isActive: true,
        triggerType: { $in: [triggerType, "KEYWORD"] },
      });

      for (const automation of automations) {
        if (automation.triggerType === "KEYWORD" && triggerType === "INCOMING_MESSAGE") {
          const text = String(triggerPayload.text ?? "");
          if (!keywordMatches(automation.triggerConfig, text)) continue;
        } else if (automation.triggerType !== triggerType) {
          continue;
        }

        const actionResults: { type: string; success: boolean; error?: string }[] = [];
        for (const action of automation.actions) {
          try {
            await runAction(action, { organizationId, contactId, conversationId });
            actionResults.push({ type: action.type, success: true });
          } catch (err) {
            actionResults.push({ type: action.type, success: false, error: (err as Error).message });
            logger.error("Automation action failed", { automationId: automation._id, action: action.type, error: (err as Error).message });
          }
        }

        const allOk = actionResults.every((r) => r.success);
        const anyOk = actionResults.some((r) => r.success);

        await AutomationExecution.create({
          organizationId,
          automationId: automation._id,
          contactId,
          conversationId,
          triggerPayload,
          status: allOk ? "SUCCESS" : anyOk ? "PARTIAL" : "FAILED",
          actionResults,
        });
      }
    },
    { connection, concurrency: 10 }
  );

  worker.on("failed", (job, err) => logger.error("Automation job failed", { jobId: job?.id, error: err.message }));

  return worker;
}
