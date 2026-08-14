import { Request, Response } from "express";
import { ok, paginated } from "../../utils/apiResponse";
import { AppError } from "../../utils/AppError";
import { sendMessageSchema, listMessagesQuerySchema } from "./message.validators";
import * as messageService from "./message.service";
import { MessagingService } from "../../services/messagingService";

export async function send(req: Request, res: Response) {
  const input = sendMessageSchema.parse(req.body);
  const organizationId = req.organizationId!;
  const base = {
    organizationId,
    whatsAppAccountId: input.whatsAppAccountId,
    to: input.to,
    conversationId: input.conversationId,
    contactId: input.contactId,
  };

  let message;
  switch (input.type) {
    case "text":
      if (!input.text) throw AppError.badRequest("text.body is required for type=text");
      message = await MessagingService.sendText({ ...base, body: input.text.body, previewUrl: input.text.previewUrl });
      break;
    case "template":
      if (!input.template) throw AppError.badRequest("template.name and template.languageCode are required");
      message = await MessagingService.sendTemplate({
        ...base,
        templateName: input.template.name,
        languageCode: input.template.languageCode,
        components: input.template.components,
      });
      break;
    case "image":
    case "document":
    case "video":
    case "audio":
      if (!input.media) throw AppError.badRequest(`media.link is required for type=${input.type}`);
      if (input.type === "image") message = await MessagingService.sendImage({ ...base, link: input.media.link, caption: input.media.caption });
      else if (input.type === "document")
        message = await MessagingService.sendDocument({ ...base, link: input.media.link, filename: input.media.filename, caption: input.media.caption });
      else if (input.type === "video") message = await MessagingService.sendVideo({ ...base, link: input.media.link, caption: input.media.caption });
      else message = await MessagingService.sendAudio({ ...base, link: input.media.link });
      break;
    case "interactive":
      if (!input.interactive) throw AppError.badRequest("interactive payload is required for type=interactive");
      message = await MessagingService.sendInteractive({ ...base, interactive: input.interactive });
      break;
  }

  return ok(res, message, 202);
}

export async function list(req: Request, res: Response) {
  const query = listMessagesQuerySchema.parse(req.query);
  const { items, nextCursor, hasMore } = await messageService.listMessages({
    organizationId: req.organizationId!,
    conversationId: query.conversationId,
    cursor: query.cursor,
    limit: query.limit,
  });
  return paginated(res, items, { nextCursor, hasMore, limit: query.limit });
}

export async function get(req: Request, res: Response) {
  const message = await messageService.getMessage(req.organizationId!, req.params.messageId);
  if (!message) throw AppError.notFound("Message not found");
  return ok(res, message);
}
