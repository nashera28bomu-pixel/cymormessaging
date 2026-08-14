import { Schema, model, Document, Types } from "mongoose";

export type AutomationTriggerType = "INCOMING_MESSAGE" | "KEYWORD" | "NEW_CONTACT" | "API_EVENT" | "SCHEDULED_EVENT";
export type AutomationActionType = "SEND_MESSAGE" | "SEND_TEMPLATE" | "ADD_TAG" | "ASSIGN_CONVERSATION" | "SEND_WEBHOOK" | "WAIT" | "UPDATE_CONTACT";

export interface IAutomationAction {
  type: AutomationActionType;
  config: Record<string, unknown>;
}

export interface IAutomation extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  isActive: boolean;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>; // e.g. { keyword: "PRICE", matchType: "contains" }
  actions: IAutomationAction[];
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const automationSchema = new Schema<IAutomation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    triggerType: { type: String, enum: ["INCOMING_MESSAGE", "KEYWORD", "NEW_CONTACT", "API_EVENT", "SCHEDULED_EVENT"], required: true },
    triggerConfig: { type: Schema.Types.Mixed, default: {} },
    actions: [
      {
        type: { type: String, enum: ["SEND_MESSAGE", "SEND_TEMPLATE", "ADD_TAG", "ASSIGN_CONVERSATION", "SEND_WEBHOOK", "WAIT", "UPDATE_CONTACT"], required: true },
        config: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

automationSchema.index({ organizationId: 1, isActive: 1, triggerType: 1 });

export const Automation = model<IAutomation>("Automation", automationSchema);

export interface IAutomationExecution extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  automationId: Types.ObjectId;
  contactId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  triggerPayload: Record<string, unknown>;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  actionResults: { type: string; success: boolean; error?: string }[];
  createdAt: Date;
}

const automationExecutionSchema = new Schema<IAutomationExecution>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: "Automation", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    triggerPayload: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["SUCCESS", "FAILED", "PARTIAL"], required: true },
    actionResults: [{ type: { type: String }, success: Boolean, error: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AutomationExecution = model<IAutomationExecution>("AutomationExecution", automationExecutionSchema);
