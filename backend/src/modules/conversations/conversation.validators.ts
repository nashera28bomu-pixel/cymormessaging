import { z } from "zod";

export const listConversationsQuerySchema = z.object({
  status: z.enum(["OPEN", "PENDING", "CLOSED"]).optional(),
  assignedAgentId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
});

export const assignConversationSchema = z.object({
  agentUserId: z.string().min(1),
});

export const updateConversationStatusSchema = z.object({
  status: z.enum(["OPEN", "PENDING", "CLOSED"]),
});

export const addTagsSchema = z.object({
  tags: z.array(z.string().min(1)).min(1),
});
