import { Response } from "express";

export function ok(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    requestId: res.locals.requestId,
  });
}

export function paginated(
  res: Response,
  items: unknown[],
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number }
) {
  return res.status(200).json({
    success: true,
    data: items,
    pagination,
    requestId: res.locals.requestId,
  });
}

export function fail(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    requestId: res.locals.requestId,
  });
}
