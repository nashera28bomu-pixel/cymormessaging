import { Types } from "mongoose";
import { Message } from "../modules/messages/message.model";
import { WhatsAppAccount } from "../modules/whatsapp/whatsappAccount.model";
import { messagesQueue } from "../queues/queues";
import { AppError } from "../utils/AppError";

interface QueueMessageParams {
  organizationId: string;
  whatsAppAccountId: string;
  to: string;
  type: "text" | "template" | "image" | "document" | "audio" | "video" | "interactive";
  content: Record<string, unknown>;
  conversationId?: string;
  contactId?: string;
  campaignId?: string;
}

/**
 * Central messaging engine. Nothing else in the codebase should call the
 * Meta Graph API directly or push to the "messages" queue directly - every
 * outbound WhatsApp send goes through here, so swapping providers or adding
 * a new one later never requires touching campaigns/automations/OTP/API code.
 */
class MessagingServiceImpl {
  async sendText(params: Omit<QueueMessageParams, "type" | "content"> & { body: string; previewUrl?: boolean }) {
    return this.enqueue({
      ...params,
      type: "text",
      content: { body: params.body, preview_url: params.previewUrl ?? false },
    });
  }

  async sendTemplate(
    params: Omit<QueueMessageParams, "type" | "content"> & {
      templateName: string;
      languageCode: string;
      components?: unknown[];
    }
  ) {
    return this.enqueue({
      ...params,
      type: "template",
      content: {
        name: params.templateName,
        language: { code: params.languageCode },
        components: params.components ?? [],
      },
    });
  }

  async sendImage(params: Omit<QueueMessageParams, "type" | "content"> & { link: string; caption?: string }) {
    return this.enqueue({ ...params, type: "image", content: { link: params.link, caption: params.caption } });
  }

  async sendDocument(
    params: Omit<QueueMessageParams, "type" | "content"> & { link: string; filename?: string; caption?: string }
  ) {
    return this.enqueue({
      ...params,
      type: "document",
      content: { link: params.link, filename: params.filename, caption: params.caption },
    });
  }

  async sendVideo(params: Omit<QueueMessageParams, "type" | "content"> & { link: string; caption?: string }) {
    return this.enqueue({ ...params, type: "video", content: { link: params.link, caption: params.caption } });
  }

  async sendAudio(params: Omit<QueueMessageParams, "type" | "content"> & { link: string }) {
    return this.enqueue({ ...params, type: "audio", content: { link: params.link } });
  }

  async sendInteractive(params: Omit<QueueMessageParams, "type" | "content"> & { interactive: Record<string, unknown> }) {
    return this.enqueue({ ...params, type: "interactive", content: params.interactive });
  }

  private async enqueue(params: QueueMessageParams) {
    const account = await WhatsAppAccount.findOne({ _id: params.whatsAppAccountId, organizationId: params.organizationId });
    if (!account || account.status !== "CONNECTED") {
      throw AppError.badRequest("No active WhatsApp connection is available", "WHATSAPP_NOT_CONNECTED");
    }

    const message = await Message.create({
      organizationId: params.organizationId,
      whatsAppAccountId: params.whatsAppAccountId,
      conversationId: params.conversationId ? new Types.ObjectId(params.conversationId) : undefined,
      contactId: params.contactId ? new Types.ObjectId(params.contactId) : undefined,
      campaignId: params.campaignId ? new Types.ObjectId(params.campaignId) : undefined,
      direction: "OUTBOUND",
      type: params.type,
      to: params.to,
      content: params.content,
      status: "QUEUED",
    });

    // The API process never talks to Meta synchronously - the worker does the actual send.
    await messagesQueue.add(
      "send",
      { messageId: String(message._id) },
      { jobId: String(message._id) } // idempotency: same message can never be double-enqueued
    );

    return message;
  }
}

export const MessagingService = new MessagingServiceImpl();
