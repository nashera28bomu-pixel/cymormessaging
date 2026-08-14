import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "./tokens";
import { User } from "../modules/users/user.model";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      organizationId?: string;
      orgRole?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired access token", "INVALID_TOKEN");
  }

  if (payload.type !== "access") {
    throw AppError.unauthorized("Invalid token type", "INVALID_TOKEN");
  }

  // Confirm the user still exists - deleted/disabled accounts lose access immediately.
  const user = await User.findById(payload.sub).select("_id").lean();
  if (!user) {
    throw AppError.unauthorized("User no longer exists", "INVALID_TOKEN");
  }

  req.userId = payload.sub;
  next();
}
