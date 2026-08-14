import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization } from "../../auth/tenant";
import * as controller from "./message.controller";

export const messagesRouter = Router();

messagesRouter.use(authenticate, requireOrganization());

messagesRouter.post("/", controller.send);
messagesRouter.get("/", controller.list);
messagesRouter.get("/:messageId", controller.get);
