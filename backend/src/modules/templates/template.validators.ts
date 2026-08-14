import { z } from "zod";

export const createTemplateSchema = z.object({
  whatsAppAccountId: z.string().min(1),
  name: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[a-z0-9_]+$/, "Template names must be lowercase letters, numbers, and underscores only"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  language: z.string().min(2),
  components: z.array(z.record(z.unknown())).min(1),
});
