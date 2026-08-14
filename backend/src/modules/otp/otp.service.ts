import crypto from "crypto";
import { OtpRequest } from "./otpRequest.model";
import { WhatsAppAccount } from "../whatsapp/whatsappAccount.model";
import { MessagingService } from "../../services/messagingService";
import { normalizePhone } from "../contacts/contact.model";
import { AppError } from "../../utils/AppError";

function generateCode(): string {
  // Cryptographically secure 6-digit code, not Math.random().
  return crypto.randomInt(100000, 999999).toString();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export async function sendOtp(params: { organizationId: string; whatsAppAccountId: string; phone: string; templateName?: string }) {
  const phone = normalizePhone(params.phone);

  const account = await WhatsAppAccount.findOne({ _id: params.whatsAppAccountId, organizationId: params.organizationId });
  if (!account || account.status !== "CONNECTED") {
    throw AppError.badRequest("No active WhatsApp connection is available", "WHATSAPP_NOT_CONNECTED");
  }

  const recentPending = await OtpRequest.findOne({ organizationId: params.organizationId, phone, status: "PENDING" }).sort({ createdAt: -1 });
  if (recentPending && Date.now() - recentPending.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    throw AppError.tooManyRequests(`Please wait before requesting another code (resend allowed after ${RESEND_COOLDOWN_SECONDS}s)`, "OTP_RESEND_TOO_SOON");
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const otpRequest = await OtpRequest.create({
    organizationId: params.organizationId,
    phone,
    codeHash: hashCode(code),
    expiresAt,
    whatsAppAccountId: account._id,
  });

  // Delivered via an APPROVED authentication-category template if configured, otherwise a plain text fallback.
  const message = params.templateName
    ? await MessagingService.sendTemplate({
        organizationId: params.organizationId,
        whatsAppAccountId: String(account._id),
        to: phone,
        templateName: params.templateName,
        languageCode: "en_US",
        components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
      })
    : await MessagingService.sendText({
        organizationId: params.organizationId,
        whatsAppAccountId: String(account._id),
        to: phone,
        body: `Your Cymor Messaging verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      });

  otpRequest.messageId = message._id;
  await otpRequest.save();

  return { otpRequestId: otpRequest._id, expiresAt };
}

export async function verifyOtp(params: { organizationId: string; phone: string; code: string }) {
  const phone = normalizePhone(params.phone);

  const otpRequest = await OtpRequest.findOne({ organizationId: params.organizationId, phone, status: "PENDING" })
    .sort({ createdAt: -1 })
    .select("+codeHash");

  if (!otpRequest) throw AppError.badRequest("No pending verification code for this phone number", "OTP_NOT_FOUND");

  if (otpRequest.expiresAt.getTime() < Date.now()) {
    otpRequest.status = "EXPIRED";
    await otpRequest.save();
    throw AppError.badRequest("Verification code has expired", "OTP_EXPIRED");
  }

  if (otpRequest.attempts >= otpRequest.maxAttempts) {
    otpRequest.status = "FAILED";
    await otpRequest.save();
    throw AppError.badRequest("Too many incorrect attempts. Request a new code.", "OTP_MAX_ATTEMPTS");
  }

  const isValid = hashCode(params.code) === otpRequest.codeHash;

  if (!isValid) {
    otpRequest.attempts += 1;
    await otpRequest.save();
    throw AppError.badRequest("Incorrect verification code", "OTP_INCORRECT", { attemptsRemaining: otpRequest.maxAttempts - otpRequest.attempts });
  }

  otpRequest.status = "VERIFIED";
  await otpRequest.save();

  return { verified: true };
}
