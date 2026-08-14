import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./template.controller";

export const templatesRouter = Router();

templatesRouter.use(authenticate, requireOrganization());

templatesRouter.get("/", controller.list);
templatesRouter.get("/:templateId", controller.get);
templatesRouter.post("/", requireRole("OWNER", "ADMIN", "DEVELOPER"), controller.create);
templatesRouter.post("/sync", requireRole("OWNER", "ADMIN", "DEVELOPER"), controller.sync);
