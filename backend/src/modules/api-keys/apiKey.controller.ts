import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as apiKeyService from "./apiKey.service";
import { createApiKeySchema } from "./apiKey.validators";

export async function list(req: Request, res: Response) {
  const keys = await apiKeyService.listApiKeys(req.organizationId!);
  return ok(res, keys);
}

export async function create(req: Request, res: Response) {
  const input = createApiKeySchema.parse(req.body);
  const { apiKey, rawKey } = await apiKeyService.createApiKey(req.organizationId!, req.userId!, input.name, input.environment);
  return ok(res, { apiKey, key: rawKey, warning: "Store this key now - it will not be shown again." }, 201);
}

export async function revoke(req: Request, res: Response) {
  const apiKey = await apiKeyService.revokeApiKey(req.organizationId!, req.params.apiKeyId, req.userId!);
  return ok(res, apiKey);
}

export async function rotate(req: Request, res: Response) {
  const { apiKey, rawKey } = await apiKeyService.rotateApiKey(req.organizationId!, req.params.apiKeyId, req.userId!);
  return ok(res, { apiKey, key: rawKey, warning: "Store this key now - it will not be shown again." });
}
