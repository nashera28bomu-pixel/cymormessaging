import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as orgService from "./organization.service";
import { createOrganizationSchema, inviteMemberSchema, updateMemberRoleSchema } from "./organization.validators";

export async function listMine(req: Request, res: Response) {
  const memberships = await orgService.listMyOrganizations(req.userId!);
  return ok(res, memberships);
}

export async function create(req: Request, res: Response) {
  const input = createOrganizationSchema.parse(req.body);
  const organization = await orgService.createOrganization(req.userId!, input.name);
  return ok(res, organization, 201);
}

export async function listMembers(req: Request, res: Response) {
  const members = await orgService.listMembers(req.organizationId!);
  return ok(res, members);
}

export async function inviteMember(req: Request, res: Response) {
  const input = inviteMemberSchema.parse(req.body);
  const { member } = await orgService.inviteMember({
    organizationId: req.organizationId!,
    invitedByUserId: req.userId!,
    email: input.email,
    role: input.role,
  });
  return ok(res, member, 201);
}

export async function updateMemberRole(req: Request, res: Response) {
  const input = updateMemberRoleSchema.parse(req.body);
  const member = await orgService.updateMemberRole(req.organizationId!, req.params.memberId, input.role, req.userId!);
  return ok(res, member);
}

export async function removeMember(req: Request, res: Response) {
  const member = await orgService.removeMember(req.organizationId!, req.params.memberId, req.userId!);
  return ok(res, member);
}
