import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization } from "../../auth/tenant";
import * as controller from "./conversation.controller";

export const conversationsRouter = Router();

conversationsRouter.use(authenticate, requireOrganization());

conversationsRouter.get("/", controller.list);
conversationsRouter.get("/:conversationId", controller.get);
conversationsRouter.post("/:conversationId/assign", controller.assign);
conversationsRouter.post("/:conversationId/status", controller.updateStatus);
conversationsRouter.post("/:conversationId/tags", controller.addTags);
conversationsRouter.post("/:conversationId/read", controller.markRead);
