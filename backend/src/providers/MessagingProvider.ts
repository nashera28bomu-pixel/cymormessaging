export interface OutboundMessageRequest {
  to: string;
  type: "text" | "template" | "image" | "document" | "audio" | "video" | "interactive";
  content: Record<string, unknown>;
}

export interface OutboundMessageResult {
  providerMessageId: string;
}

/** Any WhatsApp/messaging provider (Meta Cloud API today, others potentially in future) implements this. */
export interface MessagingProvider {
  send(accessToken: string, phoneNumberId: string, request: OutboundMessageRequest): Promise<OutboundMessageResult>;
}
