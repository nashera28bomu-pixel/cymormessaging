import winston from "winston";
import { isProduction } from "./env";

const REDACTED_KEYS = [
  "password",
  "token",
  "accesstoken",
  "apikey",
  "secret",
  "otp",
  "authorization",
];

function redact(info: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...info };
  for (const key of Object.keys(clone)) {
    if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clone[key] = "[REDACTED]";
    }
  }
  return clone;
}

const redactFormat = winston.format((info) => redact(info) as winston.Logform.TransformableInfo)();

export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: winston.format.combine(
    redactFormat,
    winston.format.timestamp(),
    isProduction ? winston.format.json() : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});
