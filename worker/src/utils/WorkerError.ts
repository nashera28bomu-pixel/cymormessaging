export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
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
  static forbidden(message: string, code = "FORBIDDEN") {
    return new AppError(code, message, 403);
  }
  static internal(message: string, code = "INTERNAL_ERROR") {
    return new AppError(code, message, 500);
  }
}
