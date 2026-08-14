export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST", details?: unknown) {
    return new AppError(code, message, 400, details);
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new AppError(code, message, 401);
  }
  static forbidden(message = "You do not have access to this resource", code = "FORBIDDEN") {
    return new AppError(code, message, 403);
  }
  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new AppError(code, message, 404);
  }
  static conflict(message: string, code = "CONFLICT") {
    return new AppError(code, message, 409);
  }
  static tooManyRequests(message = "Rate limit exceeded", code = "RATE_LIMITED") {
    return new AppError(code, message, 429);
  }
  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new AppError(code, message, 500);
  }
}
