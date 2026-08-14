import { Schema, model, Document, Types } from "mongoose";

export type OtpStatus = "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED";

export interface IOtpRequest extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  phone: string;
  codeHash: string; // never stored in plaintext
  status: OtpStatus;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  whatsAppAccountId: Types.ObjectId;
  messageId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const otpRequestSchema = new Schema<IOtpRequest>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    phone: { type: String, required: true },
    codeHash: { type: String, required: true, select: false },
    status: { type: String, enum: ["PENDING", "VERIFIED", "EXPIRED", "FAILED"], default: "PENDING" },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true },
    whatsAppAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", required: true },
    messageId: { type: Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

otpRequestSchema.index({ organizationId: 1, phone: 1, status: 1 });
// TTL cleanup: Mongo automatically deletes OTP documents an hour after expiry, so codes never linger.
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OtpRequest = model<IOtpRequest>("OtpRequest", otpRequestSchema);
