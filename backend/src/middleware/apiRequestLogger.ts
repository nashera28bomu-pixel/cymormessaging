import { NextFunction, Request, Response } from "express";
import { ApiLog } from "../modules/analytics/apiLog.model";

export function apiRequestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on("finish", () => {
    // Fire-and-forget - logging must never slow down or fail the actual request.
    if (!req.organizationId) return;
    ApiLog.create({
      organizationId: req.organizationId,
      apiKeyId: req.apiKeyId,
      method: req.method,
      endpoint: req.baseUrl + req.path,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - startedAt,
      requestId: res.locals.requestId,
    }).catch(() => {
      /* logging failures must never crash the request lifecycle */
    });
  });

  next();
}
