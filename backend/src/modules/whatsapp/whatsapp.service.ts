import { WhatsAppAccount } from "./whatsappAccount.model";
import * as meta from "../../integrations/meta/metaClient";
import { encryptSecret, decryptSecret } from "../../utils/encryption";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";
import { metaIsConfigured } from "../../config/env";

export async function connectWhatsAppAccount(params: {
  organizationId: string;
  userId: string;
  code: string; // authorization code returned by the Embedded Signup JS SDK
  wabaId: string;
  phoneNumberId: string;
}) {
  if (!metaIsConfigured) {
    throw AppError.badRequest(
      "Meta credentials are not configured on this deployment. Set META_APP_ID, META_APP_SECRET and META_SYSTEM_USER_ACCESS_TOKEN.",
      "META_NOT_CONFIGURED"
    );
  }

  const existing = await WhatsAppAccount.findOne({ phoneNumberId: params.phoneNumberId });
  if (existing && String(existing.organizationId) !== params.organizationId) {
    throw AppError.conflict("This WhatsApp phone number is already connected to a different Cymor organization");
  }

  const { accessToken } = await meta.exchangeCodeForToken(params.code);

  const [wabaDetails, phoneDetails] = await Promise.all([
    meta.fetchWabaDetails(params.wabaId, accessToken),
    meta.fetchPhoneNumberDetails(params.phoneNumberId, accessToken),
  ]);

  await meta.subscribeAppToWaba(params.wabaId, accessToken);

  const account =
    existing ??
    new WhatsAppAccount({
      organizationId: params.organizationId,
      wabaId: params.wabaId,
      phoneNumberId: params.phoneNumberId,
      connectedByUserId: params.userId,
    });

  account.wabaId = params.wabaId;
  account.displayPhoneNumber = phoneDetails.display_phone_number;
  account.verifiedName = phoneDetails.verified_name ?? wabaDetails.name;
  account.qualityRating = phoneDetails.quality_rating;
  account.encryptedAccessToken = encryptSecret(accessToken);
  account.status = "CONNECTED";
  account.lastError = undefined;
  account.connectedAt = new Date();
  await account.save();

  await recordAuditLog({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: "WHATSAPP_CONNECTED",
    resource: "whatsAppAccount",
    resourceId: String(account._id),
    metadata: { phoneNumberId: params.phoneNumberId, wabaId: params.wabaId },
  });

  return account;
}

export async function getConnectionStatus(organizationId: string) {
  return WhatsAppAccount.find({ organizationId }).sort({ createdAt: -1 }).lean();
}

/** Re-fetches live status from Meta so the dashboard can surface quality-rating/token issues. */
export async function refreshConnection(organizationId: string, accountId: string) {
  const account = await WhatsAppAccount.findOne({ _id: accountId, organizationId }).select("+encryptedAccessToken");
  if (!account) throw AppError.notFound("WhatsApp account not found");

  try {
    const accessToken = decryptSecret(account.encryptedAccessToken);
    const phoneDetails = await meta.fetchPhoneNumberDetails(account.phoneNumberId, accessToken);
    account.displayPhoneNumber = phoneDetails.display_phone_number;
    account.qualityRating = phoneDetails.quality_rating;
    account.status = "CONNECTED";
    account.lastError = undefined;
  } catch (err) {
    account.status = "ERROR";
    account.lastError = err instanceof Error ? err.message : "Unknown error";
  }

  await account.save();
  return account;
}

export async function disconnectAccount(organizationId: string, accountId: string, actorId: string) {
  const account = await WhatsAppAccount.findOne({ _id: accountId, organizationId });
  if (!account) throw AppError.notFound("WhatsApp account not found");

  account.status = "DISCONNECTED";
  await account.save();

  await recordAuditLog({
    organizationId,
    actorId,
    action: "WHATSAPP_DISCONNECTED",
    resource: "whatsAppAccount",
    resourceId: accountId,
  });

  return account;
}

/** Internal helper used by the messaging service/worker to get a usable access token for a given account. */
export async function getDecryptedAccessToken(accountId: string): Promise<{ accessToken: string; phoneNumberId: string }> {
  const account = await WhatsAppAccount.findById(accountId).select("+encryptedAccessToken");
  if (!account || account.status !== "CONNECTED") {
    throw AppError.badRequest("No active WhatsApp connection is available for this account", "WHATSAPP_NOT_CONNECTED");
  }
  return { accessToken: decryptSecret(account.encryptedAccessToken), phoneNumberId: account.phoneNumberId };
}
