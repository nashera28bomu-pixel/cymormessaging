import Redis from "ioredis";
import { env, isTest } from "./env";
import { logger } from "./logger";

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
// lazyConnect in test mode avoids noisy connection-refused retries when the
// automated test suite runs without a real Redis instance (see docs/security.md
// and tests/setup.ts - queues/rate limiting are mocked or bypassed in tests).
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: isTest,
});

redisConnection.on("error", (err) => logger.error("Redis connection error", { error: err.message }));
redisConnection.on("connect", () => logger.info("Redis connected"));
