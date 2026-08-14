import crypto from "crypto";
import { nanoid } from "nanoid";
import { ApiKey, ApiKeyEnvironment } from "./apiKey.model";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function generateRawKey(environment: ApiKeyEnvironment): { rawKey: string; prefix: string } {
  const secret = nanoid(32);
  const rawKey = `cym_${environment}_${secret}`;
  const prefix = rawKey.slice(0, 14); // e.g. cym_live_ab12cd
  return { rawKey, prefix };
}

export async function createApiKey(organizationId: string, userId: string, name: string, environment: ApiKeyEnvironment) {
  const { rawKey, prefix } = generateRawKey(environment);
  const apiKey = await ApiKey.create({
    organizationId,
    name,
    environment,
    keyPrefix: prefix,
    keyHash: hashKey(rawKey),
    createdByUserId: userId,
  });

  await recordAuditLog({ organizationId, actorId: userId, action: "API_KEY_CREATED", resource: "apiKey", resourceId: String(apiKey._id), metadata: { environment } });

  // The full key is returned exactly once - it can never be retrieved again.
  return { apiKey, rawKey };
}

export async function listApiKeys(organizationId: string) {
  return ApiKey.find({ organizationId }).select("-keyHash").sort({ createdAt: -1 }).lean();
}

export async function revokeApiKey(organizationId: string, apiKeyId: string, userId: string) {
  const apiKey = await ApiKey.findOneAndUpdate({ _id: apiKeyId, organizationId }, { $set: { revokedAt: new Date() } }, { new: true });
  if (!apiKey) throw AppError.notFound("API key not found");
  await recordAuditLog({ organizationId, actorId: userId, action: "API_KEY_REVOKED", resource: "apiKey", resourceId: apiKeyId });
  return apiKey;
}

export async function rotateApiKey(organizationId: string, apiKeyId: string, userId: string) {
  const existing = await ApiKey.findOne({ _id: apiKeyId, organizationId });
  if (!existing) throw AppError.notFound("API key not found");

  existing.revokedAt = new Date();
  await existing.save();

  const { apiKey, rawKey } = await createApiKey(organizationId, userId, `${existing.name} (rotated)`, existing.environment);
  return { apiKey, rawKey };
}

/** Used by the public-API auth middleware. Resolves a raw key from a request header to its organization. */
export async function resolveApiKey(rawKey: string) {
  const apiKey = await ApiKey.findOne({ keyHash: hashKey(rawKey), revokedAt: { $exists: false } });
  if (!apiKey) return null;

  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  return apiKey;
}
