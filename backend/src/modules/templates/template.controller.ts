import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as templateService from "./template.service";
import { createTemplateSchema } from "./template.validators";

export async function list(req: Request, res: Response) {
  const templates = await templateService.listTemplates(req.organizationId!);
  return ok(res, templates);
}

export async function get(req: Request, res: Response) {
  const template = await templateService.getTemplate(req.organizationId!, req.params.templateId);
  return ok(res, template);
}

export async function create(req: Request, res: Response) {
  const input = createTemplateSchema.parse(req.body);
  const template = await templateService.createTemplate({ organizationId: req.organizationId!, userId: req.userId!, ...input });
  return ok(res, template, 201);
}

export async function sync(req: Request, res: Response) {
  const templates = await templateService.syncTemplates(req.organizationId!, req.body.whatsAppAccountId);
  return ok(res, templates);
}
