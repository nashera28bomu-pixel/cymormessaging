import { Media } from "./media.model";
import { uploadBuffer, deleteAsset } from "../../integrations/cloudinary/cloudinaryClient";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "audio/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024; // 16MB - WhatsApp's own document limit

export async function uploadMedia(params: { organizationId: string; userId: string; file: { buffer: Buffer; mimetype: string; originalname: string; size: number } }) {
  if (!ALLOWED_MIME_TYPES.has(params.file.mimetype)) {
    throw AppError.badRequest(`Unsupported file type: ${params.file.mimetype}`, "UNSUPPORTED_MEDIA_TYPE");
  }
  if (params.file.size > MAX_FILE_SIZE_BYTES) {
    throw AppError.badRequest("File exceeds the 16MB limit", "FILE_TOO_LARGE");
  }

  const resourceType = params.file.mimetype.startsWith("image") ? "image" : params.file.mimetype.startsWith("video") ? "video" : "raw";
  const result = await uploadBuffer(params.file.buffer, params.organizationId, resourceType as "image" | "video" | "raw");

  const media = await Media.create({
    organizationId: params.organizationId,
    uploadedByUserId: params.userId,
    publicId: result.publicId,
    secureUrl: result.secureUrl,
    resourceType: result.resourceType,
    mimeType: params.file.mimetype,
    size: params.file.size,
    originalFilename: params.file.originalname,
  });

  return media;
}

export async function listMedia(organizationId: string) {
  return Media.find({ organizationId }).sort({ createdAt: -1 }).lean();
}

export async function deleteMedia(organizationId: string, mediaId: string, actorId: string) {
  const media = await Media.findOne({ _id: mediaId, organizationId });
  if (!media) throw AppError.notFound("Media not found");

  await deleteAsset(media.publicId, media.resourceType as "image" | "video" | "raw");
  await media.deleteOne();

  await recordAuditLog({ organizationId, actorId, action: "MEDIA_DELETED", resource: "media", resourceId: mediaId });
  return media;
}
