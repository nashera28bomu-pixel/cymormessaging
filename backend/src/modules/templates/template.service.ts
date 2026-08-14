import { Template } from "./template.model";
import { WhatsAppAccount } from "../whatsapp/whatsappAccount.model";
import * as meta from "../../integrations/meta/metaClient";
import { decryptSecret } from "../../utils/encryption";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

export async function listTemplates(organizationId: string) {
  return Template.find({ organizationId }).sort({ createdAt: -1 }).lean();
}

export async function getTemplate(organizationId: string, templateId: string) {
  const template = await Template.findOne({ _id: templateId, organizationId }).lean();
  if (!template) throw AppError.notFound("Template not found");
  return template;
}

/** Submits a new template to Meta for approval and stores Cymor-side metadata tracking its state. */
export async function createTemplate(params: {
  organizationId: string;
  userId: string;
  whatsAppAccountId: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: Record<string, unknown>[];
}) {
  const account = await WhatsAppAccount.findOne({ _id: params.whatsAppAccountId, organizationId: params.organizationId }).select("+encryptedAccessToken");
  if (!account || account.status !== "CONNECTED") {
    throw AppError.badRequest("No active WhatsApp connection is available", "WHATSAPP_NOT_CONNECTED");
  }

  const accessToken = decryptSecret(account.encryptedAccessToken);
  const metaResponse = await meta.createTemplate(account.wabaId, accessToken, {
    name: params.name,
    category: params.category,
    language: params.language,
    components: params.components,
  });

  const template = await Template.create({
    organizationId: params.organizationId,
    whatsAppAccountId: params.whatsAppAccountId,
    name: params.name,
    category: params.category,
    language: params.language,
    components: params.components,
    status: "PENDING",
    metaTemplateId: metaResponse.id,
    createdByUserId: params.userId,
  });

  await recordAuditLog({ organizationId: params.organizationId, actorId: params.userId, action: "TEMPLATE_SUBMITTED", resource: "template", resourceId: String(template._id) });
  return template;
}

/** Pulls the latest status for every template from Meta and updates local records (approvals happen out-of-band). */
export async function syncTemplates(organizationId: string, whatsAppAccountId: string) {
  const account = await WhatsAppAccount.findOne({ _id: whatsAppAccountId, organizationId }).select("+encryptedAccessToken");
  if (!account) throw AppError.notFound("WhatsApp account not found");

  const accessToken = decryptSecret(account.encryptedAccessToken);
  const metaTemplates = (await meta.listTemplates(account.wabaId, accessToken)) as {
    id: string; name: string; status: string; category: string; language: string; components: Record<string, unknown>[];
  }[];

  const statusMap: Record<string, string> = { APPROVED: "APPROVED", PENDING: "PENDING", REJECTED: "REJECTED", PAUSED: "PAUSED", DISABLED: "DISABLED" };

  for (const mt of metaTemplates) {
    await Template.findOneAndUpdate(
      { organizationId, name: mt.name, language: mt.language },
      {
        $set: {
          whatsAppAccountId: account._id,
          category: mt.category,
          components: mt.components,
          status: statusMap[mt.status] ?? "PENDING",
          metaTemplateId: mt.id,
        },
        $setOnInsert: { createdByUserId: account.connectedByUserId },
      },
      { upsert: true }
    );
  }

  return listTemplates(organizationId);
}
