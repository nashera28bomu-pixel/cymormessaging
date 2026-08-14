import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  environment: z.enum(["test", "live"]),
});
