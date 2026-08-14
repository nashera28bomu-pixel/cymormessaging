import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { resolveApiKey } from "../modules/api-keys/apiKey.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKeyId?: string;
      apiKeyEnvironment?: string;
    }
  }
}

/** Authenticates a public /api/v1/* request via X-API-Key and resolves its organization - no user session involved. */
export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const rawKey = req.headers["x-api-key"] as string | undefined;
  if (!rawKey) {
    throw AppError.unauthorized("Missing X-API-Key header", "API_KEY_REQUIRED");
  }

  const apiKey = await resolveApiKey(rawKey);
  if (!apiKey) {
    throw AppError.unauthorized("Invalid or revoked API key", "INVALID_API_KEY");
  }

  req.organizationId = String(apiKey.organizationId);
  req.apiKeyId = String(apiKey._id);
  req.apiKeyEnvironment = apiKey.environment;
  next();
}
