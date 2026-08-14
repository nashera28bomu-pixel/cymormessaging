import { Request, Response } from "express";
import { ok, paginated } from "../../utils/apiResponse";
import * as conversationService from "./conversation.service";
import {
  listConversationsQuerySchema,
  assignConversationSchema,
  updateConversationStatusSchema,
  addTagsSchema,
} from "./conversation.validators";

export async function list(req: Request, res: Response) {
  const query = listConversationsQuerySchema.parse(req.query);
  const { items, nextCursor, hasMore } = await conversationService.listConversations({
    organizationId: req.organizationId!,
    status: query.status,
    assignedAgentId: query.assignedAgentId,
    cursor: query.cursor,
    limit: query.limit,
  });
  return paginated(res, items, { nextCursor, hasMore, limit: query.limit });
}

export async function get(req: Request, res: Response) {
  const conversation = await conversationService.getConversation(req.organizationId!, req.params.conversationId);
  return ok(res, conversation);
}

export async function assign(req: Request, res: Response) {
  const input = assignConversationSchema.parse(req.body);
  const conversation = await conversationService.assignConversation(req.organizationId!, req.params.conversationId, input.agentUserId, req.userId!);
  return ok(res, conversation);
}

export async function updateStatus(req: Request, res: Response) {
  const input = updateConversationStatusSchema.parse(req.body);
  const conversation = await conversationService.updateConversationStatus(req.organizationId!, req.params.conversationId, input.status, req.userId!);
  return ok(res, conversation);
}

export async function addTags(req: Request, res: Response) {
  const input = addTagsSchema.parse(req.body);
  const conversation = await conversationService.addTags(req.organizationId!, req.params.conversationId, input.tags);
  return ok(res, conversation);
}

export async function markRead(req: Request, res: Response) {
  const conversation = await conversationService.markRead(req.organizationId!, req.params.conversationId);
  return ok(res, conversation);
}
