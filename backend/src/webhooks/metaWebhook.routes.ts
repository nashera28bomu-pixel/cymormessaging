import { Router, Request, Response, NextFunction } from "express";
import express from "express";
import * as controller from "./metaWebhook.controller";
import { webhookRateLimiter } from "../middleware/rateLimiters";
import { verifyWebhookSignature } from "../integrations/meta/metaClient";
import { AppError } from "../utils/AppError";

export const metaWebhookRouter = Router();

// Meta webhooks need the raw request body to validate X-Hub-Signature-256, so this
// route uses express.raw() instead of the app-wide express.json() parser.
function verifySignatureMiddleware(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const isValid = verifyWebhookSignature(req.body as Buffer, signature);
  if (!isValid) {
    throw AppError.forbidden("Invalid webhook signature", "INVALID_WEBHOOK_SIGNATURE");
  }
  req.body = JSON.parse((req.body as Buffer).toString("utf8"));
  next();
}

metaWebhookRouter.get("/", controller.verify);
metaWebhookRouter.post(
  "/",
  webhookRateLimiter,
  express.raw({ type: "application/json" }),
  verifySignatureMiddleware,
  controller.receive
);
