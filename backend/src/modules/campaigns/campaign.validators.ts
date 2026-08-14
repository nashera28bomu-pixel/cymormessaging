import { z } from "zod";

export const createCampaignSchema = z
  .object({
    whatsAppAccountId: z.string().min(1),
    name: z.string().min(1).max(160),
    templateId: z.string().min(1),
    audienceTag: z.string().optional(),
    audienceContactIds: z.array(z.string()).optional(),
    scheduledAt: z.coerce.date().optional(),
  })
  .refine((v) => v.audienceTag || (v.audienceContactIds && v.audienceContactIds.length > 0), {
    message: "Provide either audienceTag or audienceContactIds",
  });
