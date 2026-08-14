import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./whatsapp.controller";

export const whatsappRouter = Router();

whatsappRouter.use(authenticate, requireOrganization());

whatsappRouter.get("/signup-config", controller.getSignupConfig);
whatsappRouter.post("/connect", requireRole("OWNER", "ADMIN"), controller.connect);
whatsappRouter.get("/status", controller.status);
whatsappRouter.post("/:accountId/refresh", requireRole("OWNER", "ADMIN"), controller.refresh);
whatsappRouter.post("/:accountId/disconnect", requireRole("OWNER", "ADMIN"), controller.disconnect);
