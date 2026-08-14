import { Schema, model, Document, Types } from "mongoose";

export type ConversationStatus = "OPEN" | "PENDING" | "CLOSED";

export interface IConversation extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  whatsAppAccountId: Types.ObjectId;
  contactId: Types.ObjectId;
  assignedAgentId?: Types.ObjectId;
  status: ConversationStatus;
  tags: string[];
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    whatsAppAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true, index: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["OPEN", "PENDING", "CLOSED"], default: "OPEN" },
    tags: { type: [String], default: [] },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ organizationId: 1, status: 1, lastMessageAt: -1 });
conversationSchema.index({ organizationId: 1, contactId: 1, whatsAppAccountId: 1 });

export const Conversation = model<IConversation>("Conversation", conversationSchema);
