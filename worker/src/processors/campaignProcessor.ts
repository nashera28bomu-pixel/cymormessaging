import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { Campaign, CampaignRecipient } from "../models/campaign.model";
import { Template } from "../models/template.model";
import { Contact } from "../models/contact.model";
import { WhatsAppAccount } from "../models/whatsappAccount.model";
import { Message } from "../models/message.model";
import { decryptSecret } from "../utils/encryption";
import { sendMessage as sendToMeta } from "../integrations/meta/metaClient";
import { logger } from "../config/logger";

interface CampaignJobData {
  campaignId: string;
  recipientId: string;
}

export function startCampaignWorker(connection: Redis) {
  const worker = new Worker<CampaignJobData>(
    "campaigns",
    async (job: Job<CampaignJobData>) => {
      const recipient = await CampaignRecipient.findById(job.data.recipientId);
      if (!recipient || recipient.status !== "PENDING") return; // already processed - idempotent

      const campaign = await Campaign.findById(job.data.campaignId);
      if (!campaign || campaign.status !== "RUNNING") return; // paused/cancelled since enqueue

      const [template, contact, account] = await Promise.all([
        Template.findById(campaign.templateId),
        Contact.findById(recipient.contactId),
        WhatsAppAccount.findById(campaign.whatsAppAccountId).select("+encryptedAccessToken"),
      ]);

      if (!template || !contact || !account || account.status !== "CONNECTED") {
        recipient.status = "FAILED";
        recipient.errorMessage = "Missing template, contact, or WhatsApp connection";
        await recipient.save();
        campaign.stats.failed += 1;
        await campaign.save();
        return;
      }

      try {
        const accessToken = decryptSecret(account.encryptedAccessToken);
        const result = await sendToMeta(account.phoneNumberId, accessToken, {
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "template",
          template: { name: template.name, language: { code: template.language } },
        });

        const message = await Message.create({
          organizationId: campaign.organizationId,
          whatsAppAccountId: account._id,
          contactId: contact._id,
          campaignId: campaign._id,
          direction: "OUTBOUND",
          type: "template",
          to: contact.phone,
          content: { name: template.name, language: template.language },
          providerMessageId: result.messages[0].id,
          status: "SENT",
          sentAt: new Date(),
        });

        recipient.status = "SENT";
        recipient.messageId = message._id;
        await recipient.save();

        template.usageCount += 1;
        await template.save();

        campaign.stats.sent += 1;
        await campaign.save();
      } catch (err) {
        recipient.status = "FAILED";
        recipient.errorMessage = (err as Error).message;
        await recipient.save();

        campaign.stats.failed += 1;
        await campaign.save();
      }

      // Mark campaign complete once every recipient has a terminal status.
      const remaining = await CampaignRecipient.countDocuments({ campaignId: campaign._id, status: "PENDING" });
      if (remaining === 0 && campaign.status === "RUNNING") {
        campaign.status = "COMPLETED";
        await campaign.save();
      }
    },
    { connection, concurrency: 5 } // gentler concurrency than 1:1 messages - respects WhatsApp throughput tiers
  );

  worker.on("failed", (job, err) => logger.error("Campaign job failed", { jobId: job?.id, error: err.message }));

  return worker;
}
