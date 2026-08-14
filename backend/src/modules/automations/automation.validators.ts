import { z } from "zod";

const actionSchema = z.object({
  type: z.enum(["SEND_MESSAGE", "SEND_TEMPLATE", "ADD_TAG", "ASSIGN_CONVERSATION", "SEND_WEBHOOK", "WAIT", "UPDATE_CONTACT"]),
  config: z.record(z.unknown()),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(160),
  triggerType: z.enum(["INCOMING_MESSAGE", "KEYWORD", "NEW_CONTACT", "API_EVENT", "SCHEDULED_EVENT"]),
  triggerConfig: z.record(z.unknown()).default({}),
  actions: z.array(actionSchema).min(1),
});

export const toggleAutomationSchema = z.object({
  isActive: z.boolean(),
});
