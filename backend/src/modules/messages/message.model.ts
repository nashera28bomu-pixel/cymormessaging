import { Schema, model, Document, Types } from "mongoose";

export type MessageDirection = "OUTBOUND" | "INBOUND";
export type MessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "RECEIVED";
export type MessageType = "text" | "template" | "image" | "document" | "audio" | "video" | "interactive";

export interface IMessage extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  whatsAppAccountId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  contactId?: Types.ObjectId;
  campaignId?: Types.ObjectId;
  direction: MessageDirection;
  type: MessageType;
  to?: string;
  from?: string;
  content: Record<string, unknown>;
  providerMessageId?: string;
  status: MessageStatus;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    whatsAppAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", index: true },
    direction: { type: String, enum: ["OUTBOUND", "INBOUND"], required: true },
    type: { type: String, enum: ["text", "template", "image", "document", "audio", "video", "interactive"], required: true },
    to: { type: String },
    from: { type: String },
    content: { type: Schema.Types.Mixed, required: true },
    providerMessageId: { type: String, index: true, sparse: true, unique: true },
    status: { type: String, enum: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED", "RECEIVED"], default: "QUEUED", index: true },
    errorCode: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ organizationId: 1, createdAt: -1 });
messageSchema.index({ organizationId: 1, conversationId: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", messageSchema);
