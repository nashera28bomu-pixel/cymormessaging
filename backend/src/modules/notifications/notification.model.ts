import { Schema, model, Document, Types } from "mongoose";

export type NotificationType =
  | "WHATSAPP_CONNECTION_ERROR"
  | "WEBHOOK_FAILURE"
  | "CAMPAIGN_COMPLETED"
  | "CAMPAIGN_ERROR"
  | "API_ISSUE"
  | "TEAM_INVITATION"
  | "USAGE_WARNING"
  | "SECURITY_EVENT";

export interface INotification extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId; // undefined = visible to the whole organization
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ organizationId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);

export async function notify(organizationId: string, type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>) {
  return Notification.create({ organizationId, type, title, message, metadata });
}
