import { Automation, IAutomationAction, AutomationTriggerType } from "./automation.model";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

export async function listAutomations(organizationId: string) {
  return Automation.find({ organizationId }).sort({ createdAt: -1 }).lean();
}

export async function getAutomation(organizationId: string, automationId: string) {
  const automation = await Automation.findOne({ _id: automationId, organizationId }).lean();
  if (!automation) throw AppError.notFound("Automation not found");
  return automation;
}

export async function createAutomation(params: {
  organizationId: string;
  userId: string;
  name: string;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  actions: IAutomationAction[];
}) {
  const automation = await Automation.create({
    organizationId: params.organizationId,
    name: params.name,
    triggerType: params.triggerType,
    triggerConfig: params.triggerConfig,
    actions: params.actions,
    createdByUserId: params.userId,
  });
  await recordAuditLog({ organizationId: params.organizationId, actorId: params.userId, action: "AUTOMATION_CREATED", resource: "automation", resourceId: String(automation._id) });
  return automation;
}

export async function toggleAutomation(organizationId: string, automationId: string, isActive: boolean) {
  const automation = await Automation.findOneAndUpdate({ _id: automationId, organizationId }, { $set: { isActive } }, { new: true });
  if (!automation) throw AppError.notFound("Automation not found");
  return automation;
}

export async function deleteAutomation(organizationId: string, automationId: string, actorId: string) {
  const automation = await Automation.findOneAndDelete({ _id: automationId, organizationId });
  if (!automation) throw AppError.notFound("Automation not found");
  await recordAuditLog({ organizationId, actorId, action: "AUTOMATION_DELETED", resource: "automation", resourceId: automationId });
  return automation;
}
