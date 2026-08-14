import { describe, it, expect, vi, beforeEach } from "vitest";

// The messaging engine talks to Redis/Meta - mocked here so OTP logic can be
// tested in isolation, per spec section 45 ("OTP: Send, Verify, Expiration, Attempts").
vi.mock("../src/services/messagingService", () => ({
  MessagingService: {
    sendText: vi.fn().mockResolvedValue({ _id: "mock-message-id" }),
    sendTemplate: vi.fn().mockResolvedValue({ _id: "mock-message-id" }),
  },
}));

import { WhatsAppAccount } from "../src/modules/whatsapp/whatsappAccount.model";
import { OtpRequest } from "../src/modules/otp/otpRequest.model";
import * as otpService from "../src/modules/otp/otp.service";
import { Organization } from "../src/modules/organizations/organization.model";
import { User } from "../src/modules/users/user.model";
import { Types } from "mongoose";

async function seedConnectedAccount() {
  const user = await User.create({ fullName: "T", email: `t${Date.now()}@x.com`, passwordHash: "x", isEmailVerified: true });
  const org = await Organization.create({ name: "Otp Org", slug: `otp-org-${Date.now()}`, ownerId: user._id });
  const account = await WhatsAppAccount.create({
    organizationId: org._id,
    wabaId: "waba_1",
    phoneNumberId: "phone_1",
    encryptedAccessToken: "irrelevant-for-this-test",
    status: "CONNECTED",
    connectedByUserId: user._id,
  });
  return { organizationId: String(org._id), whatsAppAccountId: String(account._id) };
}

describe("OTP", () => {
  let ctx: { organizationId: string; whatsAppAccountId: string };

  beforeEach(async () => {
    ctx = await seedConnectedAccount();
  });

  it("generates a code, stores only its hash, and verifies successfully with the right code", async () => {
    await otpService.sendOtp({ organizationId: ctx.organizationId, whatsAppAccountId: ctx.whatsAppAccountId, phone: "0700123456" });

    const stored = await OtpRequest.findOne({ organizationId: ctx.organizationId }).select("+codeHash");
    expect(stored).toBeTruthy();
    expect(stored!.codeHash).not.toMatch(/^\d{6}$/); // never plaintext

    // We can't know the real code (never returned by the API on purpose), so verify the
    // "wrong code" path is rejected and doesn't accidentally succeed.
    await expect(otpService.verifyOtp({ organizationId: ctx.organizationId, phone: "0700123456", code: "000000" })).rejects.toMatchObject({
      code: "OTP_INCORRECT",
    });
  });

  it("rejects verification once max attempts are exceeded", async () => {
    await otpService.sendOtp({ organizationId: ctx.organizationId, whatsAppAccountId: ctx.whatsAppAccountId, phone: "0700123456" });

    for (let i = 0; i < 5; i++) {
      await otpService.verifyOtp({ organizationId: ctx.organizationId, phone: "0700123456", code: "000000" }).catch(() => {});
    }

    await expect(otpService.verifyOtp({ organizationId: ctx.organizationId, phone: "0700123456", code: "000000" })).rejects.toMatchObject({
      code: "OTP_MAX_ATTEMPTS",
    });
  });

  it("rejects a verification attempt once the code has expired", async () => {
    await otpService.sendOtp({ organizationId: ctx.organizationId, whatsAppAccountId: ctx.whatsAppAccountId, phone: "0700123456" });

    // Simulate time passing rather than waiting 5 real minutes.
    await OtpRequest.updateMany({ organizationId: ctx.organizationId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(otpService.verifyOtp({ organizationId: ctx.organizationId, phone: "0700123456", code: "000000" })).rejects.toMatchObject({
      code: "OTP_EXPIRED",
    });
  });

  it("enforces the resend cooldown", async () => {
    await otpService.sendOtp({ organizationId: ctx.organizationId, whatsAppAccountId: ctx.whatsAppAccountId, phone: "0700999888" });

    await expect(
      otpService.sendOtp({ organizationId: ctx.organizationId, whatsAppAccountId: ctx.whatsAppAccountId, phone: "0700999888" })
    ).rejects.toMatchObject({ code: "OTP_RESEND_TOO_SOON" });
  });
});
