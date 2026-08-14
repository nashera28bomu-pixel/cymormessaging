import "express-async-errors";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestIdMiddleware, notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { dashboardRateLimiter } from "./middleware/rateLimiters";
import { authRouter } from "./auth/auth.routes";
import { organizationsRouter } from "./modules/organizations/organization.routes";
import { whatsappRouter } from "./modules/whatsapp/whatsapp.routes";
import { messagesRouter } from "./modules/messages/message.routes";
import { contactsRouter } from "./modules/contacts/contact.routes";
import { conversationsRouter } from "./modules/conversations/conversation.routes";
import { templatesRouter } from "./modules/templates/template.routes";
import { campaignsRouter } from "./modules/campaigns/campaign.routes";
import { automationsRouter } from "./modules/automations/automation.routes";
import { apiKeysRouter } from "./modules/api-keys/apiKey.routes";
import { webhooksRouter } from "./modules/webhooks/webhook.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { analyticsRouter, auditLogsRouter, apiLogsRouter } from "./modules/analytics/analytics.routes";
import { notificationsRouter } from "./modules/notifications/notification.routes";
import { metaWebhookRouter } from "./webhooks/metaWebhook.routes";
import { publicApiRouter } from "./routes/publicApi.routes";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  // Mounted BEFORE express.json() - Meta webhooks need the raw request body to verify
  // X-Hub-Signature-256 (see metaWebhookRouter, which applies express.raw() itself).
  app.use("/webhooks/meta", metaWebhookRouter);

  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);

  app.get("/health", (req, res) => {
    res.json({ success: true, data: { status: "ok", env: env.NODE_ENV } });
  });

  // Public, unauthenticated auth endpoints.
  app.use("/api/v1/auth", authRouter);

  // Public developer API - authenticated by API key, not user session.
  app.use("/api/v1", publicApiRouter);

  // Everything below this line is authenticated dashboard traffic (user session + org membership).
  app.use("/api/v1/organizations", dashboardRateLimiter, organizationsRouter);
  app.use("/api/v1/whatsapp", dashboardRateLimiter, whatsappRouter);
  app.use("/api/v1/dashboard/messages", dashboardRateLimiter, messagesRouter);
  app.use("/api/v1/dashboard/contacts", dashboardRateLimiter, contactsRouter);
  app.use("/api/v1/conversations", dashboardRateLimiter, conversationsRouter);
  app.use("/api/v1/dashboard/templates", dashboardRateLimiter, templatesRouter);
  app.use("/api/v1/campaigns", dashboardRateLimiter, campaignsRouter);
  app.use("/api/v1/automations", dashboardRateLimiter, automationsRouter);
  app.use("/api/v1/dashboard/api-keys", dashboardRateLimiter, apiKeysRouter);
  app.use("/api/v1/dashboard/webhooks", dashboardRateLimiter, webhooksRouter);
  app.use("/api/v1/media", dashboardRateLimiter, mediaRouter);
  app.use("/api/v1/analytics", dashboardRateLimiter, analyticsRouter);
  app.use("/api/v1/audit-logs", dashboardRateLimiter, auditLogsRouter);
  app.use("/api/v1/dashboard/api-logs", dashboardRateLimiter, apiLogsRouter);
  app.use("/api/v1/notifications", dashboardRateLimiter, notificationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
