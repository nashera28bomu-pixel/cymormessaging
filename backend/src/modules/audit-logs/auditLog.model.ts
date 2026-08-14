import { Schema, model, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);

export async function recordAuditLog(entry: {
  organizationId: Types.ObjectId | string;
  actorId?: Types.ObjectId | string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await AuditLog.create(entry);
}
