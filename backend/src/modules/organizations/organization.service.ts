import { nanoid } from "nanoid";
import crypto from "crypto";
import { Organization } from "./organization.model";
import { OrganizationMember, OrgRole } from "./organizationMember.model";
import { User } from "../users/user.model";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + `-${nanoid(6).toLowerCase()}`
  );
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function listMyOrganizations(userId: string) {
  return OrganizationMember.find({ userId, status: "ACTIVE" }).populate("organizationId", "name slug timezone").lean();
}

export async function createOrganization(userId: string, name: string) {
  const organization = await Organization.create({ name, slug: slugify(name), ownerId: userId });
  await OrganizationMember.create({ organizationId: organization._id, userId, role: "OWNER", status: "ACTIVE" });
  await recordAuditLog({
    organizationId: organization._id,
    actorId: userId,
    action: "ORGANIZATION_CREATED",
    resource: "organization",
    resourceId: String(organization._id),
  });
  return organization;
}

export async function listMembers(organizationId: string) {
  return OrganizationMember.find({ organizationId, status: { $ne: "REMOVED" } })
    .populate("userId", "fullName email")
    .lean();
}

export async function inviteMember(params: {
  organizationId: string;
  invitedByUserId: string;
  email: string;
  role: OrgRole;
}) {
  const existingUser = await User.findOne({ email: params.email.toLowerCase() }).lean();

  const existingMembership = existingUser
    ? await OrganizationMember.findOne({ organizationId: params.organizationId, userId: existingUser._id }).lean()
    : null;

  if (existingMembership && existingMembership.status !== "REMOVED") {
    throw AppError.conflict("This user is already a member of the organization", "ALREADY_MEMBER");
  }

  const inviteToken = nanoid(32);

  const member = await OrganizationMember.create({
    organizationId: params.organizationId,
    userId: existingUser?._id, // may be undefined until the invitee registers
    role: params.role,
    status: "INVITED",
    invitedByUserId: params.invitedByUserId,
    invitedEmail: params.email.toLowerCase(),
    inviteTokenHash: hashToken(inviteToken),
    inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await recordAuditLog({
    organizationId: params.organizationId,
    actorId: params.invitedByUserId,
    action: "TEAM_MEMBER_INVITED",
    resource: "organizationMember",
    resourceId: String(member._id),
    metadata: { invitedEmail: params.email, role: params.role },
  });

  // TODO(email-provider): email inviteToken to params.email as an invite link.
  return { member, inviteToken };
}

export async function updateMemberRole(organizationId: string, memberId: string, role: OrgRole, actorId: string) {
  const member = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!member) throw AppError.notFound("Team member not found");

  if (member.role === "OWNER" && role !== "OWNER") {
    throw AppError.forbidden("Ownership must be transferred explicitly and cannot be changed via role update");
  }

  member.role = role;
  await member.save();

  await recordAuditLog({
    organizationId,
    actorId,
    action: "TEAM_MEMBER_ROLE_UPDATED",
    resource: "organizationMember",
    resourceId: memberId,
    metadata: { newRole: role },
  });

  return member;
}

export async function removeMember(organizationId: string, memberId: string, actorId: string) {
  const member = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!member) throw AppError.notFound("Team member not found");
  if (member.role === "OWNER") {
    throw AppError.forbidden("The organization owner cannot be removed");
  }

  member.status = "REMOVED";
  await member.save();

  await recordAuditLog({
    organizationId,
    actorId,
    action: "TEAM_MEMBER_REMOVED",
    resource: "organizationMember",
    resourceId: memberId,
  });

  return member;
}
