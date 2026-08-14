import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const QUEUE_NAMES = {
  MESSAGES: "messages",
  CAMPAIGNS: "campaigns",
  WEBHOOKS: "webhooks",
  AUTOMATIONS: "automations",
  OTP: "otp",
  MEDIA: "media",
} as const;

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 5000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export const messagesQueue = new Queue(QUEUE_NAMES.MESSAGES, { connection: redisConnection, defaultJobOptions });
export const campaignsQueue = new Queue(QUEUE_NAMES.CAMPAIGNS, { connection: redisConnection, defaultJobOptions });
export const webhooksQueue = new Queue(QUEUE_NAMES.WEBHOOKS, { connection: redisConnection, defaultJobOptions });
export const automationsQueue = new Queue(QUEUE_NAMES.AUTOMATIONS, { connection: redisConnection, defaultJobOptions });
export const otpQueue = new Queue(QUEUE_NAMES.OTP, { connection: redisConnection, defaultJobOptions });
export const mediaQueue = new Queue(QUEUE_NAMES.MEDIA, { connection: redisConnection, defaultJobOptions });

export interface SendMessageJobData {
  messageId: string;
}

export interface ProcessWebhookJobData {
  rawEventId: string; // reference to a stored raw webhook payload, for idempotent processing
}

export interface RunAutomationJobData {
  automationId: string;
  organizationId: string;
  contactId: string;
  conversationId?: string;
  triggerPayload: Record<string, unknown>;
}

export interface SendOtpJobData {
  otpRequestId: string;
}

export interface ProcessCampaignRecipientJobData {
  campaignId: string;
  recipientId: string;
}
