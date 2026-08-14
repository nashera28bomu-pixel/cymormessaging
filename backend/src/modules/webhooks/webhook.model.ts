import { Schema, model, Document, Types } from "mongoose";

export const WEBHOOK_EVENTS = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
  "conversation.created",
  "conversation.assigned",
  "campaign.completed",
  "automation.triggered",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface IWebhook extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  url: string;
  events: WebhookEvent[];
  secret: string; // used to sign outbound payloads (X-Cymor-Signature)
  isActive: boolean;
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    url: { type: String, required: true },
    events: { type: [String], enum: WEBHOOK_EVENTS, required: true },
    secret: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Webhook = model<IWebhook>("Webhook", webhookSchema);

export interface IWebhookDelivery extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  webhookId: Types.ObjectId;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  responseStatus?: number;
  success: boolean;
  attempt: number;
  errorMessage?: string;
  createdAt: Date;
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    webhookId: { type: Schema.Types.ObjectId, ref: "Webhook", required: true, index: true },
    event: { type: String, enum: WEBHOOK_EVENTS, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    responseStatus: { type: Number },
    success: { type: Boolean, required: true },
    attempt: { type: Number, default: 1 },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

webhookDeliverySchema.index({ organizationId: 1, createdAt: -1 });

export const WebhookDelivery = model<IWebhookDelivery>("WebhookDelivery", webhookDeliverySchema);
