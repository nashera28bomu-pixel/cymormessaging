import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const listContactsQuerySchema = z.object({
  search: z.string().optional(),
  tag: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(25),
});

export const importContactsSchema = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string().optional(),
        phone: z.string().min(6),
        email: z.string().email().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .max(5000),
});
