import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as campaignService from "./campaign.service";
import { createCampaignSchema } from "./campaign.validators";

export async function create(req: Request, res: Response) {
  const input = createCampaignSchema.parse(req.body);
  const campaign = await campaignService.createCampaign({ organizationId: req.organizationId!, userId: req.userId!, ...input });
  return ok(res, campaign, 201);
}

export async function list(req: Request, res: Response) {
  const campaigns = await campaignService.listCampaigns(req.organizationId!);
  return ok(res, campaigns);
}

export async function get(req: Request, res: Response) {
  const campaign = await campaignService.getCampaign(req.organizationId!, req.params.campaignId);
  return ok(res, campaign);
}

export async function start(req: Request, res: Response) {
  const campaign = await campaignService.startCampaign(req.organizationId!, req.params.campaignId, req.userId!);
  return ok(res, campaign);
}

export async function pause(req: Request, res: Response) {
  const campaign = await campaignService.pauseCampaign(req.organizationId!, req.params.campaignId, req.userId!);
  return ok(res, campaign);
}

export async function cancel(req: Request, res: Response) {
  const campaign = await campaignService.cancelCampaign(req.organizationId!, req.params.campaignId, req.userId!);
  return ok(res, campaign);
}
