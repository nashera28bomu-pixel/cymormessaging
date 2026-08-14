import { Schema, model, Document, Types } from "mongoose";

export type ApiKeyEnvironment = "test" | "live";

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  environment: ApiKeyEnvironment;
  keyPrefix: string; // e.g. cym_live_ab12 - shown in UI/logs, never the full secret
  keyHash: string; // sha256 of the full key - the full key is never stored
  createdByUserId: Types.ObjectId;
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    environment: { type: String, enum: ["test", "live"], required: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, select: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

export const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);
