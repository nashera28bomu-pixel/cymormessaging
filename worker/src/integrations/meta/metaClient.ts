import axios, { AxiosInstance } from "axios";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/WorkerError";

const GRAPH_BASE_URL = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}`;

function client(accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: GRAPH_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
}

function toAppError(err: unknown): AppError {
  if (axios.isAxiosError(err)) {
    const metaError = err.response?.data?.error;
    logger.error("Meta Graph API error", {
      status: err.response?.status,
      code: metaError?.code,
      type: metaError?.type,
      message: metaError?.message,
    });
    return new AppError(
      "WHATSAPP_PROVIDER_ERROR",
      metaError?.message ?? "The WhatsApp provider rejected this request",
      502,
      { metaErrorCode: metaError?.code, metaErrorType: metaError?.type }
    );
  }
  return AppError.internal("Unexpected error communicating with WhatsApp");
}

/**
 * Step 1 of Embedded Signup: exchange the short-lived authorization code
 * returned to the frontend for a long-lived system user access token.
 */
export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; expiresIn?: number }> {
  try {
    const res = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token`, {
      params: {
        client_id: env.META_APP_ID,
        client_secret: env.META_APP_SECRET,
        code,
      },
    });
    return { accessToken: res.data.access_token, expiresIn: res.data.expires_in };
  } catch (err) {
    throw toAppError(err);
  }
}

export async function fetchWabaDetails(wabaId: string, accessToken: string) {
  try {
    const res = await client(accessToken).get(`/${wabaId}`, {
      params: { fields: "id,name,timezone_id,message_template_namespace" },
    });
    return res.data;
  } catch (err) {
    throw toAppError(err);
  }
}

export async function fetchPhoneNumberDetails(phoneNumberId: string, accessToken: string) {
  try {
    const res = await client(accessToken).get(`/${phoneNumberId}`, {
      params: { fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status" },
    });
    return res.data;
  } catch (err) {
    throw toAppError(err);
  }
}

/** Subscribes the app to receive webhook events for this WABA (messages, statuses, template updates). */
export async function subscribeAppToWaba(wabaId: string, accessToken: string) {
  try {
    await client(accessToken).post(`/${wabaId}/subscribed_apps`);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function registerPhoneNumber(phoneNumberId: string, pin: string, accessToken: string) {
  try {
    await client(accessToken).post(`/${phoneNumberId}/register`, { messaging_product: "whatsapp", pin });
  } catch (err) {
    throw toAppError(err);
  }
}

export interface SendMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: string;
  [key: string]: unknown;
}

export async function sendMessage(phoneNumberId: string, accessToken: string, payload: SendMessagePayload) {
  try {
    const res = await client(accessToken).post(`/${phoneNumberId}/messages`, payload);
    return res.data as { messages: { id: string }[] };
  } catch (err) {
    throw toAppError(err);
  }
}

export async function listTemplates(wabaId: string, accessToken: string) {
  try {
    const res = await client(accessToken).get(`/${wabaId}/message_templates`, {
      params: { limit: 100 },
    });
    return res.data.data as unknown[];
  } catch (err) {
    throw toAppError(err);
  }
}

export async function createTemplate(wabaId: string, accessToken: string, template: Record<string, unknown>) {
  try {
    const res = await client(accessToken).post(`/${wabaId}/message_templates`, template);
    return res.data;
  } catch (err) {
    throw toAppError(err);
  }
}

/** Verifies the webhook subscription handshake Meta performs when you register a callback URL. */
export function verifyWebhookChallenge(mode: string | undefined, token: string | undefined, challenge: string | undefined): string {
  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && challenge) {
    return challenge;
  }
  throw AppError.forbidden("Webhook verification failed", "WEBHOOK_VERIFICATION_FAILED");
}

/** Validates the X-Hub-Signature-256 header Meta sends on every webhook POST. */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const crypto = require("crypto") as typeof import("crypto");
  const expected = "sha256=" + crypto.createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
