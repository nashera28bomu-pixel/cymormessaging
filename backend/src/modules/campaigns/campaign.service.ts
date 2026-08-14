import { Campaign, CampaignRecipient } from "./campaign.model";
import { Contact } from "../contacts/contact.model";
import { Template } from "../templates/template.model";
import { campaignsQueue } from "../../queues/queues";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

export async function createCampaign(params: {
  organizationId: string;
  userId: string;
  whatsAppAccountId: string;
  name: string;
  templateId: string;
  audienceTag?: string;
  audienceContactIds?: string[];
  scheduledAt?: Date;
}) {
  const template = await Template.findOne({ _id: params.templateId, organizationId: params.organizationId });
  if (!template) throw AppError.notFound("Template not found");
  if (template.status !== "APPROVED") {
    throw AppError.badRequest("Only APPROVED templates can be used in a campaign", "TEMPLATE_NOT_APPROVED");
  }

  const campaign = await Campaign.create({
    organizationId: params.organizationId,
    whatsAppAccountId: params.whatsAppAccountId,
    name: params.name,
    templateId: params.templateId,
    audienceTag: params.audienceTag,
    audienceContactIds: params.audienceContactIds,
    scheduledAt: params.scheduledAt,
    status: params.scheduledAt ? "SCHEDULED" : "DRAFT",
    createdByUserId: params.userId,
  });

  await recordAuditLog({ organizationId: params.organizationId, actorId: params.userId, action: "CAMPAIGN_CREATED", resource: "campaign", resourceId: String(campaign._id) });
  return campaign;
}

export async function listCampaigns(organizationId: string) {
  return Campaign.find({ organizationId }).populate("templateId", "name category").sort({ createdAt: -1 }).lean();
}

export async function getCampaign(organizationId: string, campaignId: string) {
  const campaign = await Campaign.findOne({ _id: campaignId, organizationId }).populate("templateId").lean();
  if (!campaign) throw AppError.notFound("Campaign not found");
  return campaign;
}

/** Resolves the audience, materializes CampaignRecipient rows, and enqueues one job per recipient. */
export async function startCampaign(organizationId: string, campaignId: string, actorId: string) {
  const campaign = await Campaign.findOne({ _id: campaignId, organizationId });
  if (!campaign) throw AppError.notFound("Campaign not found");
  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    throw AppError.badRequest(`Campaign cannot be started from status ${campaign.status}`, "INVALID_CAMPAIGN_STATE");
  }

  const contactFilter: Record<string, unknown> = { organizationId };
  if (campaign.audienceContactIds?.length) contactFilter._id = { $in: campaign.audienceContactIds };
  else if (campaign.audienceTag) contactFilter.tags = campaign.audienceTag;
  else throw AppError.badRequest("Campaign has no audience configured", "NO_AUDIENCE");

  const contacts = await Contact.find(contactFilter).select("_id").lean();
  if (contacts.length === 0) throw AppError.badRequest("Resolved audience is empty", "EMPTY_AUDIENCE");

  await CampaignRecipient.bulkWrite(
    contacts.map((c) => ({
      updateOne: {
        filter: { campaignId: campaign._id, contactId: c._id },
        update: { $setOnInsert: { organizationId, campaignId: campaign._id, contactId: c._id, status: "PENDING" } },
        upsert: true,
      },
    }))
  );

  campaign.status = "RUNNING";
  campaign.stats.total = contacts.length;
  await campaign.save();

  const recipients = await CampaignRecipient.find({ campaignId: campaign._id, status: "PENDING" }).select("_id").lean();

  // Each recipient is its own queue job - a 50,000-contact campaign never blocks a single HTTP request,
  // and a failure sending to one recipient never affects the others.
  await campaignsQueue.addBulk(
    recipients.map((r) => ({
      name: "send-to-recipient",
      data: { campaignId: String(campaign._id), recipientId: String(r._id) },
      opts: { jobId: `campaign-${campaign._id}-recipient-${r._id}` },
    }))
  );

  await recordAuditLog({ organizationId, actorId, action: "CAMPAIGN_STARTED", resource: "campaign", resourceId: campaignId, metadata: { recipientCount: recipients.length } });
  return campaign;
}

export async function pauseCampaign(organizationId: string, campaignId: string, actorId: string) {
  const campaign = await Campaign.findOneAndUpdate({ _id: campaignId, organizationId, status: "RUNNING" }, { $set: { status: "PAUSED" } }, { new: true });
  if (!campaign) throw AppError.notFound("Running campaign not found");
  await recordAuditLog({ organizationId, actorId, action: "CAMPAIGN_PAUSED", resource: "campaign", resourceId: campaignId });
  return campaign;
}

export async function cancelCampaign(organizationId: string, campaignId: string, actorId: string) {
  const campaign = await Campaign.findOneAndUpdate({ _id: campaignId, organizationId, status: { $in: ["DRAFT", "SCHEDULED", "RUNNING", "PAUSED"] } }, { $set: { status: "CANCELLED" } }, { new: true });
  if (!campaign) throw AppError.notFound("Campaign not found or already finished");
  await recordAuditLog({ organizationId, actorId, action: "CAMPAIGN_CANCELLED", resource: "campaign", resourceId: campaignId });
  return campaign;
}
