import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisConnection } from "../config/redis";
import { fail } from "../utils/apiResponse";
import { isTest } from "../config/env";

function makeStore(prefix: string) {
  // In the test environment there is no Redis instance available, and rate limiting
  // itself isn't what the automated test suite exercises (see docs/security.md) -
  // so tests fall back to express-rate-limit's built-in in-memory store instead.
  if (isTest) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => redisConnection.call(...args) as unknown as Promise<unknown>,
    prefix: `rl:${prefix}:`,
  });
}

function limitHandler(name: string) {
  return (req: import("express").Request, res: import("express").Response) => {
    fail(res, 429, "RATE_LIMITED", `Too many ${name} requests. Please slow down and try again shortly.`);
  };
}

// Auth endpoints (register/login/reset) - tight limits to slow credential stuffing.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("auth"),
  handler: limitHandler("authentication"),
});

// General authenticated dashboard traffic - generous, per-user.
export const dashboardRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("dashboard"),
  keyGenerator: (req) => req.userId ?? req.ip ?? "anonymous",
  handler: limitHandler("dashboard"),
});

// Public developer API - keyed by API key, not IP, since many businesses share IP ranges.
export const publicApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("public-api"),
  keyGenerator: (req) => (req.headers["x-api-key"] as string) ?? req.ip ?? "anonymous",
  handler: limitHandler("API"),
});

// OTP send/verify - very tight, since this endpoint can be abused for spam/toll fraud.
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("otp"),
  keyGenerator: (req) => (req.headers["x-api-key"] as string) ?? req.ip ?? "anonymous",
  handler: limitHandler("OTP"),
});

// Inbound Meta webhooks - generous but present, to absorb traffic spikes/retries safely.
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("webhook"),
  handler: limitHandler("webhook"),
});
