import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as webhookService from "./webhook.service";
import { createWebhookSchema } from "./webhook.validators";
import { WebhookDelivery } from "./webhook.model";

export async function list(req: Request, res: Response) {
  const webhooks = await webhookService.listWebhooks(req.organizationId!);
  return ok(res, webhooks);
}

export async function create(req: Request, res: Response) {
  const input = createWebhookSchema.parse(req.body);
  const webhook = await webhookService.createWebhook(req.organizationId!, req.userId!, input.url, input.events);
  // The secret is only ever visible in this creation response, matching API key conventions.
  return ok(res, webhook, 201);
}

export async function remove(req: Request, res: Response) {
  await webhookService.deleteWebhook(req.organizationId!, req.params.webhookId, req.userId!);
  return ok(res, { deleted: true });
}

export async function deliveries(req: Request, res: Response) {
  const items = await WebhookDelivery.find({ organizationId: req.organizationId }).sort({ createdAt: -1 }).limit(100).lean();
  return ok(res, items);
}
