import { z } from "zod";

export const sendMessageSchema = z.object({
  whatsAppAccountId: z.string().min(1),
  to: z.string().min(6, "A destination phone number in international format is required"),
  type: z.enum(["text", "template", "image", "document", "audio", "video", "interactive"]),
  text: z.object({ body: z.string().min(1), previewUrl: z.boolean().optional() }).optional(),
  template: z
    .object({ name: z.string().min(1), languageCode: z.string().min(2), components: z.array(z.unknown()).optional() })
    .optional(),
  media: z.object({ link: z.string().url(), caption: z.string().optional(), filename: z.string().optional() }).optional(),
  interactive: z.record(z.unknown()).optional(),
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
});

export const listMessagesQuerySchema = z.object({
  conversationId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
});
