import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./campaign.controller";

export const campaignsRouter = Router();

campaignsRouter.use(authenticate, requireOrganization());

campaignsRouter.get("/", controller.list);
campaignsRouter.post("/", requireRole("OWNER", "ADMIN"), controller.create);
campaignsRouter.get("/:campaignId", controller.get);
campaignsRouter.post("/:campaignId/start", requireRole("OWNER", "ADMIN"), controller.start);
campaignsRouter.post("/:campaignId/pause", requireRole("OWNER", "ADMIN"), controller.pause);
campaignsRouter.post("/:campaignId/cancel", requireRole("OWNER", "ADMIN"), controller.cancel);
