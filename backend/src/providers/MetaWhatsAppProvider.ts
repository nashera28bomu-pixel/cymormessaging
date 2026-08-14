import { MessagingProvider, OutboundMessageRequest, OutboundMessageResult } from "./MessagingProvider";
import * as meta from "../integrations/meta/metaClient";
import { AppError } from "../utils/AppError";

function buildGraphPayload(request: OutboundMessageRequest): meta.SendMessagePayload {
  const base = { messaging_product: "whatsapp" as const, to: request.to, type: request.type };

  switch (request.type) {
    case "text":
      return { ...base, text: request.content };
    case "template":
      return { ...base, template: request.content };
    case "image":
      return { ...base, image: request.content };
    case "document":
      return { ...base, document: request.content };
    case "audio":
      return { ...base, audio: request.content };
    case "video":
      return { ...base, video: request.content };
    case "interactive":
      return { ...base, interactive: request.content };
    default:
      throw AppError.badRequest(`Unsupported message type: ${request.type}`, "UNSUPPORTED_MESSAGE_TYPE");
  }
}

export const MetaWhatsAppProvider: MessagingProvider = {
  async send(accessToken, phoneNumberId, request): Promise<OutboundMessageResult> {
    const payload = buildGraphPayload(request);
    const result = await meta.sendMessage(phoneNumberId, accessToken, payload);
    const providerMessageId = result.messages?.[0]?.id;
    if (!providerMessageId) {
      throw AppError.internal("WhatsApp provider did not return a message ID");
    }
    return { providerMessageId };
  },
};
