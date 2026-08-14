import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { OrganizationMember, OrgRole } from "../modules/organizations/organizationMember.model";

/**
 * Resolves the caller's organization membership for the current request.
 *
 * SECURITY: the client may indicate *which* organization it wants to act as
 * (e.g. via X-Organization-Id header, since a user can belong to several),
 * but the ACTUAL organizationId used for every downstream query comes only
 * from a verified OrganizationMember record looked up by req.userId. A
 * client can never grant itself access to an organization by supplying an
 * arbitrary ID - if no active membership exists, the request is rejected.
 */
export function requireOrganization() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
      throw AppError.unauthorized();
    }

    const requestedOrgId = req.headers["x-organization-id"] as string | undefined;
    if (!requestedOrgId) {
      throw AppError.badRequest("X-Organization-Id header is required", "ORGANIZATION_ID_REQUIRED");
    }

    const membership = await OrganizationMember.findOne({
      organizationId: requestedOrgId,
      userId: req.userId,
      status: "ACTIVE",
    }).lean();

    if (!membership) {
      throw AppError.forbidden("You are not a member of this organization", "NOT_AN_ORGANIZATION_MEMBER");
    }

    req.organizationId = String(membership.organizationId);
    req.orgRole = membership.role;
    next();
  };
}

/** Restricts a route to specific organization roles. Must run after requireOrganization(). */
export function requireRole(...allowedRoles: OrgRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.orgRole) {
      throw AppError.forbidden("Organization role not resolved", "ROLE_NOT_RESOLVED");
    }
    if (!allowedRoles.includes(req.orgRole as OrgRole)) {
      throw AppError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
        "INSUFFICIENT_ROLE"
      );
    }
    next();
  };
}
