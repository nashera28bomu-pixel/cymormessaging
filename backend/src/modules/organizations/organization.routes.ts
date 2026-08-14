import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./organization.controller";

export const organizationsRouter = Router();

// Routes that don't require an already-selected organization context.
organizationsRouter.get("/mine", authenticate, controller.listMine);
organizationsRouter.post("/", authenticate, controller.create);

// Routes below require X-Organization-Id + active membership.
organizationsRouter.get("/members", authenticate, requireOrganization(), controller.listMembers);
organizationsRouter.post(
  "/members/invite",
  authenticate,
  requireOrganization(),
  requireRole("OWNER", "ADMIN"),
  controller.inviteMember
);
organizationsRouter.patch(
  "/members/:memberId/role",
  authenticate,
  requireOrganization(),
  requireRole("OWNER", "ADMIN"),
  controller.updateMemberRole
);
organizationsRouter.delete(
  "/members/:memberId",
  authenticate,
  requireOrganization(),
  requireRole("OWNER", "ADMIN"),
  controller.removeMember
);
