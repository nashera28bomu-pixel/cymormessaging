import { z } from "zod";
import { ORG_ROLES } from "./organizationMember.model";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ORG_ROLES),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ORG_ROLES),
});
