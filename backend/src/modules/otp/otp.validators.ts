import { z } from "zod";

export const sendOtpSchema = z.object({
  whatsAppAccountId: z.string().min(1),
  phone: z.string().min(6),
  templateName: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(6),
  code: z.string().length(6),
});
