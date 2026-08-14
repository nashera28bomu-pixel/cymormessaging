import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./automation.controller";

export const automationsRouter = Router();

automationsRouter.use(authenticate, requireOrganization());

automationsRouter.get("/", controller.list);
automationsRouter.get("/:automationId", controller.get);
automationsRouter.post("/", requireRole("OWNER", "ADMIN"), controller.create);
automationsRouter.post("/:automationId/toggle", requireRole("OWNER", "ADMIN"), controller.toggle);
automationsRouter.delete("/:automationId", requireRole("OWNER", "ADMIN"), controller.remove);
