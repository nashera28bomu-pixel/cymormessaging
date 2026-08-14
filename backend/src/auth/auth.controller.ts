import { Request, Response } from "express";
import { ok } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "./auth.validators";
import * as authService from "./auth.service";
import { signAccessToken, verifyRefreshToken } from "./tokens";
import { User } from "../modules/users/user.model";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const { user, organization } = await authService.registerUser(input);

  // TODO(email-provider): send emailVerificationToken via the configured email provider.
  return ok(
    res,
    {
      user: { id: user._id, fullName: user.fullName, email: user.email },
      organization: { id: organization._id, name: organization.name, slug: organization.slug },
      message: "Account created. Please check your email to verify your account.",
    },
    201
  );
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken, memberships } = await authService.loginUser(input.email, input.password);

  return ok(res, {
    user: { id: user._id, fullName: user.fullName, email: user.email, isEmailVerified: user.isEmailVerified },
    accessToken,
    refreshToken,
    organizations: memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
    })),
  });
}

export async function refresh(req: Request, res: Response) {
  const input = refreshTokenSchema.parse(req.body);

  let payload;
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) throw AppError.unauthorized("User no longer exists", "INVALID_REFRESH_TOKEN");

  const accessToken = signAccessToken(String(user._id));
  return ok(res, { accessToken });
}

export async function verifyEmail(req: Request, res: Response) {
  const input = verifyEmailSchema.parse(req.body);
  await authService.verifyEmail(input.token);
  return ok(res, { message: "Email verified successfully" });
}

export async function forgotPassword(req: Request, res: Response) {
  const input = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(input.email);
  // TODO(email-provider): send resetToken via email if a user was found.
  return ok(res, { message: "If that email exists, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(input.token, input.newPassword);
  return ok(res, { message: "Password reset successfully" });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.userId).lean();
  if (!user) throw AppError.unauthorized();
  return ok(res, { id: user._id, fullName: user.fullName, email: user.email, isEmailVerified: user.isEmailVerified });
}
