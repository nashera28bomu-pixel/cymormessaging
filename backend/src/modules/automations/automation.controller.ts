import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as automationService from "./automation.service";
import { createAutomationSchema, toggleAutomationSchema } from "./automation.validators";

export async function list(req: Request, res: Response) {
  const automations = await automationService.listAutomations(req.organizationId!);
  return ok(res, automations);
}

export async function get(req: Request, res: Response) {
  const automation = await automationService.getAutomation(req.organizationId!, req.params.automationId);
  return ok(res, automation);
}

export async function create(req: Request, res: Response) {
  const input = createAutomationSchema.parse(req.body);
  const automation = await automationService.createAutomation({ organizationId: req.organizationId!, userId: req.userId!, ...input });
  return ok(res, automation, 201);
}

export async function toggle(req: Request, res: Response) {
  const input = toggleAutomationSchema.parse(req.body);
  const automation = await automationService.toggleAutomation(req.organizationId!, req.params.automationId, input.isActive);
  return ok(res, automation);
}

export async function remove(req: Request, res: Response) {
  await automationService.deleteAutomation(req.organizationId!, req.params.automationId, req.userId!);
  return ok(res, { deleted: true });
}
