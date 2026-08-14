import { Schema, model, Document, Types } from "mongoose";

export type UsageMetric = "MESSAGE_SENT" | "MESSAGE_RECEIVED" | "API_REQUEST" | "CAMPAIGN_RECIPIENT" | "OTP_SENT" | "MEDIA_UPLOAD_BYTES";

export interface IUsageRecord extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  metric: UsageMetric;
  quantity: number;
  periodKey: string; // "YYYY-MM-DD", one document per org/metric/day - cheap to aggregate, cheap to bill from later
  createdAt: Date;
  updatedAt: Date;
}

const usageRecordSchema = new Schema<IUsageRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    metric: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    periodKey: { type: String, required: true },
  },
  { timestamps: true }
);

usageRecordSchema.index({ organizationId: 1, metric: 1, periodKey: 1 }, { unique: true });

export const UsageRecord = model<IUsageRecord>("UsageRecord", usageRecordSchema);

export async function incrementUsage(organizationId: string, metric: UsageMetric, quantity = 1) {
  const periodKey = new Date().toISOString().slice(0, 10);
  await UsageRecord.findOneAndUpdate(
    { organizationId, metric, periodKey },
    { $inc: { quantity } },
    { upsert: true }
  );
}
