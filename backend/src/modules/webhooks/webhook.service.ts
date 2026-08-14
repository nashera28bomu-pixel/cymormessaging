import crypto from "crypto";
import axios from "axios";
import { nanoid } from "nanoid";
import { Webhook, WebhookDelivery, WebhookEvent } from "./webhook.model";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

export async function listWebhooks(organizationId: string) {
  return Webhook.find({ organizationId }).lean();
}

export async function createWebhook(organizationId: string, userId: string, url: string, events: WebhookEvent[]) {
  const webhook = await Webhook.create({
    organizationId,
    url,
    events,
    secret: nanoid(40),
    createdByUserId: userId,
  });
  await recordAuditLog({ organizationId, actorId: userId, action: "WEBHOOK_CREATED", resource: "webhook", resourceId: String(webhook._id) });
  return webhook;
}

export async function deleteWebhook(organizationId: string, webhookId: string, userId: string) {
  const webhook = await Webhook.findOneAndDelete({ _id: webhookId, organizationId });
  if (!webhook) throw AppError.notFound("Webhook not found");
  await recordAuditLog({ organizationId, actorId: userId, action: "WEBHOOK_DELETED", resource: "webhook", resourceId: webhookId });
  return webhook;
}

/** Fires a platform event to every organization webhook subscribed to it. Never throws to the caller. */
export async function dispatchEvent(organizationId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const webhooks = await Webhook.find({ organizationId, events: event, isActive: true }).select("+secret");

  await Promise.all(
    webhooks.map(async (webhook) => {
      const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
      const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");

      try {
        const response = await axios.post(webhook.url, body, {
          headers: { "Content-Type": "application/json", "X-Cymor-Signature": signature },
          timeout: 8000,
        });
        await WebhookDelivery.create({
          organizationId,
          webhookId: webhook._id,
          event,
          payload,
          responseStatus: response.status,
          success: response.status >= 200 && response.status < 300,
        });
      } catch (err) {
        const error = err as { response?: { status?: number }; message?: string };
        await WebhookDelivery.create({
          organizationId,
          webhookId: webhook._id,
          event,
          payload,
          responseStatus: error.response?.status,
          success: false,
          errorMessage: error.message,
        });
      }
    })
  );
}
