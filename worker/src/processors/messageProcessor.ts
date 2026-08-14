import { Worker, Job } from "bullmq";
import { Message } from "../models/message.model";
import { WhatsAppAccount } from "../models/whatsappAccount.model";
import { decryptSecret } from "../utils/encryption";
import { sendMessage as sendToMeta, SendMessagePayload } from "../integrations/meta/metaClient";
import { logger } from "../config/logger";
import Redis from "ioredis";

interface SendMessageJobData {
  messageId: string;
}

function buildGraphPayload(type: string, to: string, content: Record<string, unknown>): SendMessagePayload {
  return { messaging_product: "whatsapp", to, type, [type]: content } as SendMessagePayload;
}

export function startMessageWorker(connection: Redis) {
  const worker = new Worker<SendMessageJobData>(
    "messages",
    async (job: Job<SendMessageJobData>) => {
      const message = await Message.findById(job.data.messageId);
      if (!message) {
        logger.warn("Message no longer exists, skipping", { messageId: job.data.messageId });
        return;
      }
      if (message.status !== "QUEUED") {
        // Already processed (e.g. duplicate delivery of the same job) - idempotent no-op.
        logger.info("Message already processed, skipping", { messageId: job.data.messageId, status: message.status });
        return;
      }

      const account = await WhatsAppAccount.findById(message.whatsAppAccountId).select("+encryptedAccessToken");
      if (!account || account.status !== "CONNECTED") {
        message.status = "FAILED";
        message.errorCode = "WHATSAPP_NOT_CONNECTED";
        message.errorMessage = "The WhatsApp account is not connected";
        message.failedAt = new Date();
        await message.save();
        return;
      }

      try {
        const accessToken = decryptSecret(account.encryptedAccessToken);
        const payload = buildGraphPayload(message.type, message.to!, message.content);
        const result = await sendToMeta(account.phoneNumberId, accessToken, payload);

        message.providerMessageId = result.messages[0].id;
        message.status = "SENT";
        message.sentAt = new Date();
        await message.save();
      } catch (err) {
        const error = err as { message?: string; code?: string };
        message.status = "FAILED";
        message.errorMessage = error.message ?? "Unknown error sending message";
        message.errorCode = error.code ?? "SEND_FAILED";
        message.failedAt = new Date();
        await message.save();
        // Re-throw so BullMQ applies its retry/backoff policy for transient provider errors.
        throw err;
      }
    },
    { connection, concurrency: 10 }
  );

  worker.on("failed", (job, err) => {
    logger.error("Message job failed", { jobId: job?.id, error: err.message });
  });

  return worker;
}
