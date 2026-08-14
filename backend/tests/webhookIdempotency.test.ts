import { describe, it, expect, vi, beforeEach } from "vitest";

// Automation dispatch and realtime emission are irrelevant to idempotency and touch
// Redis/Socket.io - mocked out so this test is a pure database-idempotency check.
vi.mock("../src/queues/queues", () => ({
  automationsQueue: { add: vi.fn().mockResolvedValue(undefined) },
  messagesQueue: { add: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../src/sockets/realtime", () => ({
  emitToOrganization: vi.fn(),
}));

import { receive } from "../src/webhooks/metaWebhook.controller";
import { WhatsAppAccount } from "../src/modules/whatsapp/whatsappAccount.model";
import { Message } from "../src/modules/messages/message.model";
import { RawMetaEvent } from "../src/modules/webhooks/rawMetaEvent.model";
import { Organization } from "../src/modules/organizations/organization.model";
import { User } from "../src/modules/users/user.model";
import { Request, Response } from "express";

function fakeRes(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function inboundMessagePayload(phoneNumberId: string, messageId: string) {
  return {
    entry: [
      {
        id: "waba-entry-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: "Jane Customer" }, wa_id: "254700111222" }],
              messages: [{ id: messageId, from: "254700111222", type: "text", timestamp: "1710000000", text: { body: "Is this in stock?" } }],
            },
          },
        ],
      },
    ],
  };
}

describe("Meta webhook idempotency", () => {
  let phoneNumberId: string;

  beforeEach(async () => {
    const user = await User.create({ fullName: "T", email: `wh${Date.now()}@x.com`, passwordHash: "x", isEmailVerified: true });
    const org = await Organization.create({ name: "Webhook Org", slug: `webhook-org-${Date.now()}`, ownerId: user._id });
    phoneNumberId = `phone_${Date.now()}`;
    await WhatsAppAccount.create({
      organizationId: org._id,
      wabaId: "waba_1",
      phoneNumberId,
      encryptedAccessToken: "irrelevant",
      status: "CONNECTED",
      connectedByUserId: user._id,
    });
  });

  it("creates exactly one Message even when Meta delivers the identical event twice", async () => {
    const payload = inboundMessagePayload(phoneNumberId, "wamid.SAME_MESSAGE_ID");

    await receive({ body: payload } as Request, fakeRes());
    await receive({ body: payload } as Request, fakeRes()); // Meta's own retry - identical payload

    const messages = await Message.find({ providerMessageId: "wamid.SAME_MESSAGE_ID" });
    expect(messages).toHaveLength(1);

    const rawEvents = await RawMetaEvent.find({});
    expect(rawEvents).toHaveLength(1);
    expect(rawEvents[0].processed).toBe(true);
  });

  it("creates separate messages for genuinely different inbound events", async () => {
    await receive({ body: inboundMessagePayload(phoneNumberId, "wamid.FIRST") } as Request, fakeRes());
    await receive({ body: inboundMessagePayload(phoneNumberId, "wamid.SECOND") } as Request, fakeRes());

    const messages = await Message.find({ direction: "INBOUND" });
    expect(messages).toHaveLength(2);
  });

  it("silently ignores a webhook for a phone number Cymor has never connected", async () => {
    const payload = inboundMessagePayload("unknown_phone_number_id", "wamid.UNKNOWN");
    await receive({ body: payload } as Request, fakeRes());

    const messages = await Message.find({ providerMessageId: "wamid.UNKNOWN" });
    expect(messages).toHaveLength(0);
  });
});
