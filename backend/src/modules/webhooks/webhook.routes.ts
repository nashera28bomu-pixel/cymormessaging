import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./webhook.controller";

export const webhooksRouter = Router();

webhooksRouter.use(authenticate, requireOrganization());

webhooksRouter.get("/", controller.list);
webhooksRouter.post("/", requireRole("OWNER", "ADMIN", "DEVELOPER"), controller.create);
webhooksRouter.delete("/:webhookId", requireRole("OWNER", "ADMIN", "DEVELOPER"), controller.remove);
webhooksRouter.get("/deliveries", controller.deliveries);
