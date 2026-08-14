import { Router } from "express";
import { authenticateApiKey } from "../auth/authenticateApiKey";
import { apiRequestLogger } from "../middleware/apiRequestLogger";
import { publicApiRateLimiter, otpRateLimiter } from "../middleware/rateLimiters";
import * as messageController from "../modules/messages/message.controller";
import * as contactController from "../modules/contacts/contact.controller";
import * as templateController from "../modules/templates/template.controller";
import * as otpController from "../modules/otp/otp.controller";
import * as webhookController from "../modules/webhooks/webhook.controller";
import { ok } from "../utils/apiResponse";
import * as analyticsService from "../modules/analytics/analytics.service";

export const publicApiRouter = Router();

// Every public API route is authenticated by API key, rate-limited per key, and logged.
publicApiRouter.use(authenticateApiKey, publicApiRateLimiter, apiRequestLogger);

publicApiRouter.post("/messages", messageController.send);
publicApiRouter.get("/messages", messageController.list);
publicApiRouter.get("/messages/:messageId", messageController.get);

publicApiRouter.get("/contacts", contactController.list);
publicApiRouter.post("/contacts", contactController.create);
publicApiRouter.get("/contacts/:contactId", contactController.get);
publicApiRouter.patch("/contacts/:contactId", contactController.update);
publicApiRouter.delete("/contacts/:contactId", contactController.remove);

publicApiRouter.get("/templates", templateController.list);

publicApiRouter.post("/otp/send", otpRateLimiter, otpController.send);
publicApiRouter.post("/otp/verify", otpRateLimiter, otpController.verify);

publicApiRouter.get("/webhooks", webhookController.list);
publicApiRouter.post("/webhooks", webhookController.create);
publicApiRouter.delete("/webhooks/:webhookId", webhookController.remove);

publicApiRouter.get("/usage", async (req, res) => {
  const usage = await analyticsService.getUsage(req.organizationId!);
  return ok(res, usage);
});
