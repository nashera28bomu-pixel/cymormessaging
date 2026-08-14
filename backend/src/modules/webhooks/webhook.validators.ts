import { z } from "zod";
import { WEBHOOK_EVENTS } from "./webhook.model";

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});
