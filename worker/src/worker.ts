import "dotenv/config";
import mongoose from "mongoose";
import Redis from "ioredis";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { startMessageWorker } from "./processors/messageProcessor";
import { startCampaignWorker } from "./processors/campaignProcessor";
import { startAutomationWorker } from "./processors/automationProcessor";

/**
 * Cymor Messaging background worker.
 *
 * Consumes BullMQ queues backed by Redis and performs work that must never
 * block an HTTP request: sending queued WhatsApp messages, campaign
 * recipient sends, and automation actions. OTP delivery reuses the same
 * "messages" queue via MessagingService, so no separate OTP processor is
 * needed. Inbound webhook processing is handled synchronously (but fast -
 * respond 200 immediately, then process) inside the API process itself,
 * since it must complete before Meta's own retry window; see
 * backend/src/webhooks/metaWebhook.controller.ts.
 */
async function main() {
  await mongoose.connect(env.MONGODB_URI);
  logger.info("Worker connected to MongoDB");

  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on("connect", () => logger.info("Worker connected to Redis"));

  const messageWorker = startMessageWorker(connection);
  const campaignWorker = startCampaignWorker(connection);
  const automationWorker = startAutomationWorker(connection);

  logger.info("Cymor Messaging worker is running (messages, campaigns, automations)");

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down worker gracefully`);
    await Promise.all([messageWorker.close(), campaignWorker.close(), automationWorker.close()]);
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Worker fatal error", { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
