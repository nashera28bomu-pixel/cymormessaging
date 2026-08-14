import { Schema, model, Document, Types } from "mongoose";

export type WhatsAppConnectionStatus = "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";

export interface IWhatsAppAccount extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  encryptedAccessToken: string;
  status: WhatsAppConnectionStatus;
  lastError?: string;
  connectedByUserId: Types.ObjectId;
  connectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppAccountSchema = new Schema<IWhatsAppAccount>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    wabaId: { type: String, required: true },
    phoneNumberId: { type: String, required: true, unique: true },
    displayPhoneNumber: { type: String },
    verifiedName: { type: String },
    qualityRating: { type: String },
    encryptedAccessToken: { type: String, required: true, select: false },
    status: { type: String, enum: ["PENDING", "CONNECTED", "ERROR", "DISCONNECTED"], default: "PENDING" },
    lastError: { type: String },
    connectedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    connectedAt: { type: Date },
  },
  { timestamps: true }
);

// One organization typically manages a small number of numbers; index for fast lookups both ways.
whatsAppAccountSchema.index({ organizationId: 1, status: 1 });

export const WhatsAppAccount = model<IWhatsAppAccount>("WhatsAppAccount", whatsAppAccountSchema);
