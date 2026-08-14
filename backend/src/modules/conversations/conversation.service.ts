import { Contact, normalizePhone } from "../contacts/contact.model";
import { Conversation } from "./conversation.model";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

export async function findOrCreateContact(organizationId: string, phone: string, profileName?: string) {
  const normalized = normalizePhone(phone);
  const contact = await Contact.findOneAndUpdate(
    { organizationId, phone: normalized },
    {
      $setOnInsert: { organizationId, phone: normalized, name: profileName },
      $set: { lastInteractionAt: new Date() },
    },
    { upsert: true, new: true }
  );
  return contact;
}

export async function findOrCreateConversation(params: {
  organizationId: string;
  whatsAppAccountId: string;
  contactId: string;
}) {
  const conversation = await Conversation.findOneAndUpdate(
    {
      organizationId: params.organizationId,
      whatsAppAccountId: params.whatsAppAccountId,
      contactId: params.contactId,
    },
    {
      $setOnInsert: {
        organizationId: params.organizationId,
        whatsAppAccountId: params.whatsAppAccountId,
        contactId: params.contactId,
        status: "OPEN",
      },
    },
    { upsert: true, new: true }
  );
  return conversation;
}

export async function touchConversationOnInbound(conversationId: string, preview: string) {
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { lastMessageAt: new Date(), lastMessagePreview: preview, status: "OPEN" },
    $inc: { unreadCount: 1 },
  });
}

export async function touchConversationOnOutbound(conversationId: string, preview: string) {
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { lastMessageAt: new Date(), lastMessagePreview: preview },
  });
}

export async function listConversations(params: {
  organizationId: string;
  status?: string;
  assignedAgentId?: string;
  cursor?: string;
  limit: number;
}) {
  const filter: Record<string, unknown> = { organizationId: params.organizationId };
  if (params.status) filter.status = params.status;
  if (params.assignedAgentId) filter.assignedAgentId = params.assignedAgentId;
  if (params.cursor) filter._id = { $lt: params.cursor };

  const items = await Conversation.find(filter)
    .populate("contactId", "name phone")
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(params.limit + 1)
    .lean();

  const hasMore = items.length > params.limit;
  const page = hasMore ? items.slice(0, params.limit) : items;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return { items: page, nextCursor, hasMore };
}

export async function getConversation(organizationId: string, conversationId: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, organizationId }).populate("contactId").lean();
  if (!conversation) throw AppError.notFound("Conversation not found");
  return conversation;
}

export async function assignConversation(organizationId: string, conversationId: string, agentUserId: string, actorId: string) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, organizationId },
    { $set: { assignedAgentId: agentUserId } },
    { new: true }
  );
  if (!conversation) throw AppError.notFound("Conversation not found");
  await recordAuditLog({ organizationId, actorId, action: "CONVERSATION_ASSIGNED", resource: "conversation", resourceId: conversationId, metadata: { agentUserId } });
  return conversation;
}

export async function updateConversationStatus(organizationId: string, conversationId: string, status: string, actorId: string) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, organizationId },
    { $set: { status, ...(status === "OPEN" ? { unreadCount: 0 } : {}) } },
    { new: true }
  );
  if (!conversation) throw AppError.notFound("Conversation not found");
  await recordAuditLog({ organizationId, actorId, action: "CONVERSATION_STATUS_UPDATED", resource: "conversation", resourceId: conversationId, metadata: { status } });
  return conversation;
}

export async function addTags(organizationId: string, conversationId: string, tags: string[]) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, organizationId },
    { $addToSet: { tags: { $each: tags } } },
    { new: true }
  );
  if (!conversation) throw AppError.notFound("Conversation not found");
  return conversation;
}

export async function markRead(organizationId: string, conversationId: string) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, organizationId },
    { $set: { unreadCount: 0 } },
    { new: true }
  );
  if (!conversation) throw AppError.notFound("Conversation not found");
  return conversation;
}
