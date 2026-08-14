import { Schema, model, Document, Types } from "mongoose";

export interface IApiLog extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  apiKeyId?: Types.ObjectId;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  requestId: string;
  createdAt: Date;
}

const apiLogSchema = new Schema<IApiLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    apiKeyId: { type: Schema.Types.ObjectId, ref: "ApiKey" },
    method: { type: String, required: true },
    endpoint: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true },
    requestId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

apiLogSchema.index({ organizationId: 1, createdAt: -1 });

export const ApiLog = model<IApiLog>("ApiLog", apiLogSchema);
