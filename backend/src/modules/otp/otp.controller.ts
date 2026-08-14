import { Request, Response } from "express";
import { ok } from "../../utils/apiResponse";
import * as otpService from "./otp.service";
import { sendOtpSchema, verifyOtpSchema } from "./otp.validators";

export async function send(req: Request, res: Response) {
  const input = sendOtpSchema.parse(req.body);
  const result = await otpService.sendOtp({ organizationId: req.organizationId!, ...input });
  return ok(res, result, 202);
}

export async function verify(req: Request, res: Response) {
  const input = verifyOtpSchema.parse(req.body);
  const result = await otpService.verifyOtp({ organizationId: req.organizationId!, ...input });
  return ok(res, result);
}
