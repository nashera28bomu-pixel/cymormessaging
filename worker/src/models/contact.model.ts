import { Schema, model, Document, Types } from "mongoose";

export interface IContact extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name?: string;
  phone: string; // normalized, e.g. 2547XXXXXXXX
  email?: string;
  tags: string[];
  notes?: string;
  customFields: Record<string, unknown>;
  lastInteractionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    tags: { type: [String], default: [] },
    notes: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
    lastInteractionAt: { type: Date },
  },
  { timestamps: true }
);

// A phone number identifies one contact per organization - prevents unnecessary duplicates.
contactSchema.index({ organizationId: 1, phone: 1 }, { unique: true });
contactSchema.index({ organizationId: 1, tags: 1 });
contactSchema.index({ organizationId: 1, name: "text", email: "text" });

export const Contact = model<IContact>("Contact", contactSchema);

/** Normalizes to Kenyan-first international format (2547XXXXXXXX), the convention used across Cymor products. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}
