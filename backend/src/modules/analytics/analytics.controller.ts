import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as analyticsService from "./analytics.service";

export async function overview(req: Request, res: Response) {
  const organizationId = req.organizationId!;
  const [messaging, conversations, campaigns, api] = await Promise.all([
    analyticsService.getMessagingAnalytics(organizationId),
    analyticsService.getConversationAnalytics(organizationId),
    analyticsService.getCampaignAnalytics(organizationId),
    analyticsService.getApiAnalytics(organizationId),
  ]);
  return ok(res, { messaging, conversations, campaigns, api });
}

export async function usage(req: Request, res: Response) {
  const records = await analyticsService.getUsage(req.organizationId!);
  return ok(res, records);
}
