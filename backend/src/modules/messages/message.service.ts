import { Message } from "./message.model";

export async function listMessages(params: {
  organizationId: string;
  conversationId?: string;
  cursor?: string;
  limit: number;
}) {
  const filter: Record<string, unknown> = { organizationId: params.organizationId };
  if (params.conversationId) filter.conversationId = params.conversationId;
  if (params.cursor) filter._id = { $lt: params.cursor };

  // Cursor pagination by _id (roughly time-ordered) avoids loading large offsets into memory.
  const items = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(params.limit + 1)
    .lean();

  const hasMore = items.length > params.limit;
  const page = hasMore ? items.slice(0, params.limit) : items;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return { items: page, nextCursor, hasMore };
}

export async function getMessage(organizationId: string, messageId: string) {
  return Message.findOne({ _id: messageId, organizationId }).lean();
}
