import bcrypt from "bcryptjs";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { User } from "../modules/users/user.model";
import { Organization } from "../modules/organizations/organization.model";
import { OrganizationMember } from "../modules/organizations/organizationMember.model";
import { AppError } from "../utils/AppError";
import { signAccessToken, signRefreshToken } from "./tokens";
import { recordAuditLog } from "../modules/audit-logs/auditLog.model";

const SALT_ROUNDS = 12;

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

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() }).lean();
  if (existing) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const emailVerificationToken = nanoid(32);

  const user = await User.create({
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    passwordHash,
    isEmailVerified: false,
    emailVerificationTokenHash: hashToken(emailVerificationToken),
    emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const organization = await Organization.create({
    name: input.organizationName,
    slug: slugify(input.organizationName),
    ownerId: user._id,
  });

  await OrganizationMember.create({
    organizationId: organization._id,
    userId: user._id,
    role: "OWNER",
    status: "ACTIVE",
  });

  user.defaultOrganizationId = organization._id;
  await user.save();

  await recordAuditLog({
    organizationId: organization._id,
    actorId: user._id,
    action: "USER_REGISTERED",
    resource: "organization",
    resourceId: String(organization._id),
  });

  // In production this token is emailed via the email provider, never returned in the API response.
  return { user, organization, emailVerificationToken };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken(String(user._id));
  const refreshToken = signRefreshToken(String(user._id));

  const memberships = await OrganizationMember.find({ userId: user._id, status: "ACTIVE" })
    .populate("organizationId", "name slug")
    .lean();

  return { user, accessToken, refreshToken, memberships };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw AppError.badRequest("Invalid or expired verification token", "INVALID_VERIFICATION_TOKEN");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always behave the same way whether or not the account exists, to avoid leaking which emails are registered.
  if (!user) return null;

  const resetToken = nanoid(32);
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  return resetToken;
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw AppError.badRequest("Invalid or expired reset token", "INVALID_RESET_TOKEN");
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  return user;
}
