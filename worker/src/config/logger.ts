import winston from "winston";
import { env } from "./env";

const REDACTED_KEYS = ["password", "token", "accesstoken", "apikey", "secret", "otp", "authorization"];

function redact(info: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...info };
  for (const key of Object.keys(clone)) {
    if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) clone[key] = "[REDACTED]";
  }
  return clone;
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format((info) => redact(info) as winston.Logform.TransformableInfo)(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
