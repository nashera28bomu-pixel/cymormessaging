import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as whatsappService from "./whatsapp.service";
import { connectWhatsAppSchema } from "./whatsapp.validators";
import { env, metaIsConfigured } from "../../config/env";

export async function getSignupConfig(req: Request, res: Response) {
  // The frontend uses this to initialize the Facebook JS SDK / Embedded Signup launch call.
  return ok(res, {
    metaAppId: env.META_APP_ID,
    configurationId: env.META_CONFIGURATION_ID,
    graphApiVersion: env.META_GRAPH_API_VERSION,
    isConfigured: metaIsConfigured,
  });
}

export async function connect(req: Request, res: Response) {
  const input = connectWhatsAppSchema.parse(req.body);
  const account = await whatsappService.connectWhatsAppAccount({
    organizationId: req.organizationId!,
    userId: req.userId!,
    ...input,
  });
  return ok(res, account, 201);
}

export async function status(req: Request, res: Response) {
  const accounts = await whatsappService.getConnectionStatus(req.organizationId!);
  return ok(res, accounts);
}

export async function refresh(req: Request, res: Response) {
  const account = await whatsappService.refreshConnection(req.organizationId!, req.params.accountId);
  return ok(res, account);
}

export async function disconnect(req: Request, res: Response) {
  const account = await whatsappService.disconnectAccount(req.organizationId!, req.params.accountId, req.userId!);
  return ok(res, account);
}
