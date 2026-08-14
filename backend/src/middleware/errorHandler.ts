import { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = `req_${nanoid(12)}`;
  res.setHeader("X-Request-Id", res.locals.requestId);
  next();
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: "ROUTE_NOT_FOUND", message: `No route for ${req.method} ${req.originalUrl}` },
    requestId: res.locals.requestId,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const requestId = res.locals.requestId;

  if (err instanceof ZodError) {
    logger.warn("Validation error", { requestId, path: req.path, issues: err.issues });
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: err.flatten() },
      requestId,
    });
  }

  if (err instanceof AppError) {
    logger.warn(err.code, { requestId, path: req.path, message: err.message });
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    });
  }

  const error = err as Error;
  logger.error("Unhandled error", { requestId, path: req.path, message: error?.message, stack: error?.stack });

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Our team has been notified.",
      // Never leak stack traces to API consumers, even internally-facing ones.
      details: isProduction ? undefined : error?.message,
    },
    requestId,
  });
}
