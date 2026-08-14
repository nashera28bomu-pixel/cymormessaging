import { Schema, model, Document, Types } from "mongoose";

export type TemplateStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  whatsAppAccountId: Types.ObjectId;
  name: string;
  category: TemplateCategory;
  language: string;
  components: Record<string, unknown>[];
  status: TemplateStatus;
  metaTemplateId?: string;
  rejectionReason?: string;
  usageCount: number;
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    whatsAppAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", required: true },
    name: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, enum: ["MARKETING", "UTILITY", "AUTHENTICATION"], required: true },
    language: { type: String, required: true },
    components: { type: [Schema.Types.Mixed], required: true },
    status: { type: String, enum: ["DRAFT", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"], default: "DRAFT" },
    metaTemplateId: { type: String },
    rejectionReason: { type: String },
    usageCount: { type: Number, default: 0 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

templateSchema.index({ organizationId: 1, name: 1, language: 1 }, { unique: true });

export const Template = model<ITemplate>("Template", templateSchema);
