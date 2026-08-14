import { Message } from "../messages/message.model";
import { Conversation } from "../conversations/conversation.model";
import { Campaign } from "../campaigns/campaign.model";
import { ApiLog } from "./apiLog.model";
import { UsageRecord } from "./usageRecord.model";

function last30Days(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

export async function getMessagingAnalytics(organizationId: string) {
  const since = last30Days();
  const results = await Message.aggregate([
    { $match: { organizationId: { $eq: organizationId }, createdAt: { $gte: since } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {};
  for (const r of results) counts[r._id] = r.count;

  return {
    sent: (counts.SENT ?? 0) + (counts.DELIVERED ?? 0) + (counts.READ ?? 0),
    delivered: (counts.DELIVERED ?? 0) + (counts.READ ?? 0),
    read: counts.READ ?? 0,
    failed: counts.FAILED ?? 0,
    received: counts.RECEIVED ?? 0,
  };
}

export async function getConversationAnalytics(organizationId: string) {
  const since = last30Days();
  const [open, closed, newCount] = await Promise.all([
    Conversation.countDocuments({ organizationId, status: "OPEN" }),
    Conversation.countDocuments({ organizationId, status: "CLOSED" }),
    Conversation.countDocuments({ organizationId, createdAt: { $gte: since } }),
  ]);
  return { open, closed, new: newCount };
}

export async function getCampaignAnalytics(organizationId: string) {
  const campaigns = await Campaign.find({ organizationId }).select("stats status").lean();
  return campaigns.reduce(
    (totals, c) => ({
      recipients: totals.recipients + c.stats.total,
      sent: totals.sent + c.stats.sent,
      delivered: totals.delivered + c.stats.delivered,
      read: totals.read + c.stats.read,
      failed: totals.failed + c.stats.failed,
    }),
    { recipients: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
  );
}

export async function getApiAnalytics(organizationId: string) {
  const since = last30Days();
  const results = await ApiLog.aggregate([
    { $match: { organizationId: { $eq: organizationId }, createdAt: { $gte: since } } },
    { $group: { _id: { $cond: [{ $lt: ["$statusCode", 400] }, "success", "error"] }, count: { $sum: 1 } } },
  ]);
  const counts: Record<string, number> = {};
  for (const r of results) counts[r._id] = r.count;
  return { requests: (counts.success ?? 0) + (counts.error ?? 0), successes: counts.success ?? 0, errors: counts.error ?? 0 };
}

export async function getUsage(organizationId: string) {
  return UsageRecord.find({ organizationId }).sort({ periodKey: -1 }).limit(90).lean();
}
