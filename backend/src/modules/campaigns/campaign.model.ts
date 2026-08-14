import { Schema, model, Document, Types } from "mongoose";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  whatsAppAccountId: Types.ObjectId;
  name: string;
  templateId: Types.ObjectId;
  audienceTag?: string;
  audienceContactIds?: Types.ObjectId[];
  status: CampaignStatus;
  scheduledAt?: Date;
  createdByUserId: Types.ObjectId;
  stats: { total: number; sent: number; delivered: number; read: number; failed: number };
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    whatsAppAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", required: true },
    name: { type: String, required: true, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: "Template", required: true },
    audienceTag: { type: String },
    audienceContactIds: [{ type: Schema.Types.ObjectId, ref: "Contact" }],
    status: { type: String, enum: ["DRAFT", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"], default: "DRAFT" },
    scheduledAt: { type: Date },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

campaignSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const Campaign = model<ICampaign>("Campaign", campaignSchema);

export type CampaignRecipientStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface ICampaignRecipient extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  campaignId: Types.ObjectId;
  contactId: Types.ObjectId;
  messageId?: Types.ObjectId;
  status: CampaignRecipientStatus;
  errorMessage?: string;
  createdAt: Date;
}

const campaignRecipientSchema = new Schema<ICampaignRecipient>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    messageId: { type: Schema.Types.ObjectId, ref: "Message" },
    status: { type: String, enum: ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"], default: "PENDING" },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

campaignRecipientSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });

export const CampaignRecipient = model<ICampaignRecipient>("CampaignRecipient", campaignRecipientSchema);
