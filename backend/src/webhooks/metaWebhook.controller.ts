import { Request, Response } from "express";
import * as meta from "../integrations/meta/metaClient";
import { RawMetaEvent } from "../modules/webhooks/rawMetaEvent.model";
import { WhatsAppAccount } from "../modules/whatsapp/whatsappAccount.model";
import { Message } from "../modules/messages/message.model";
import { findOrCreateContact, findOrCreateConversation, touchConversationOnInbound } from "../modules/conversations/conversation.service";
import { emitToOrganization } from "../sockets/realtime";
import { automationsQueue } from "../queues/queues";
import { logger } from "../config/logger";

/** GET handshake Meta performs once, when you register the callback URL in the App Dashboard. */
export function verify(req: Request, res: Response) {
  const challenge = meta.verifyWebhookChallenge(
    req.query["hub.mode"] as string | undefined,
    req.query["hub.verify_token"] as string | undefined,
    req.query["hub.challenge"] as string | undefined
  );
  res.status(200).send(challenge);
}

interface MetaMessageEntry {
  field: string;
  value: {
    metadata: { phone_number_id: string };
    contacts?: { profile: { name: string }; wa_id: string }[];
    messages?: {
      id: string;
      from: string;
      type: string;
      timestamp: string;
      text?: { body: string };
      [key: string]: unknown;
    }[];
    statuses?: {
      id: string;
      status: "sent" | "delivered" | "read" | "failed";
      timestamp: string;
      errors?: { code: number; title: string }[];
    }[];
  };
}

async function processMessageEvent(entry: MetaMessageEntry) {
  const { metadata, contacts, messages } = entry.value;
  const account = await WhatsAppAccount.findOne({ phoneNumberId: metadata.phone_number_id });
  if (!account) {
    logger.warn("Received webhook for unknown phone number", { phoneNumberId: metadata.phone_number_id });
    return;
  }

  for (const inbound of messages ?? []) {
    // Idempotency: Meta's own message ID is the dedupe key for the Message collection (unique index).
    const alreadyProcessed = await Message.findOne({ providerMessageId: inbound.id }).lean();
    if (alreadyProcessed) continue;

    const profileName = contacts?.find((c) => c.wa_id === inbound.from)?.profile?.name;
    const contact = await findOrCreateContact(String(account.organizationId), inbound.from, profileName);
    const conversation = await findOrCreateConversation({
      organizationId: String(account.organizationId),
      whatsAppAccountId: String(account._id),
      contactId: String(contact._id),
    });

    const preview = inbound.type === "text" ? inbound.text?.body ?? "" : `[${inbound.type}]`;

    const message = await Message.create({
      organizationId: account.organizationId,
      whatsAppAccountId: account._id,
      conversationId: conversation._id,
      contactId: contact._id,
      direction: "INBOUND",
      type: inbound.type,
      from: inbound.from,
      content: inbound,
      providerMessageId: inbound.id,
      status: "RECEIVED",
    });

    await touchConversationOnInbound(String(conversation._id), preview);

    emitToOrganization(String(account.organizationId), "message:received", {
      conversationId: String(conversation._id),
      message,
    });

    // Hand off to the automation engine (Phase 12) - keyword triggers, welcome flows, etc.
    await automationsQueue.add("evaluate-inbound", {
      organizationId: String(account.organizationId),
      contactId: String(contact._id),
      conversationId: String(conversation._id),
      triggerType: "INCOMING_MESSAGE",
      triggerPayload: { text: preview, messageId: String(message._id) },
    });
  }

  for (const status of entry.value.statuses ?? []) {
    const message = await Message.findOne({ providerMessageId: status.id });
    if (!message) continue; // status for a message we don't (yet) know about - safe to ignore

    const statusMap: Record<string, string> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };
    const mapped = statusMap[status.status];
    if (!mapped) continue;

    message.status = mapped as typeof message.status;
    if (status.status === "delivered") message.deliveredAt = new Date();
    if (status.status === "read") message.readAt = new Date();
    if (status.status === "failed") {
      message.failedAt = new Date();
      message.errorMessage = status.errors?.[0]?.title;
      message.errorCode = String(status.errors?.[0]?.code ?? "");
    }
    await message.save();

    emitToOrganization(String(account.organizationId), "message:status", {
      messageId: String(message._id),
      status: message.status,
    });
  }
}

/** POST handler for all subscribed WABA events. Must always return 200 quickly so Meta doesn't retry endlessly. */
export async function receive(req: Request, res: Response) {
  // Respond immediately - Meta expects a fast 200 and will retry aggressively on timeouts.
  res.status(200).send("EVENT_RECEIVED");

  try {
    const body = req.body as { entry?: { id: string; changes: MetaMessageEntry[] }[] };
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const dedupeKey =
          change.value.messages?.map((m) => m.id).join(",") ||
          change.value.statuses?.map((s) => s.id + s.status).join(",") ||
          `${entry.id}-${Date.now()}`;

        const existing = await RawMetaEvent.findOne({ dedupeKey }).lean();
        if (existing?.processed) continue;

        try {
          await processMessageEvent(change);
          await RawMetaEvent.findOneAndUpdate(
            { dedupeKey },
            { $setOnInsert: { dedupeKey, payload: change }, $set: { processed: true } },
            { upsert: true }
          );
        } catch (err) {
          logger.error("Failed processing webhook event", { error: (err as Error).message, dedupeKey });
          await RawMetaEvent.findOneAndUpdate(
            { dedupeKey },
            { $setOnInsert: { dedupeKey, payload: change }, $set: { processingError: (err as Error).message } },
            { upsert: true }
          );
        }
      }
    }
  } catch (err) {
    logger.error("Unhandled webhook processing error", { error: (err as Error).message });
  }
}
