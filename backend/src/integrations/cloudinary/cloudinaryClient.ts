import { v2 as cloudinary } from "cloudinary";
import { env, cloudinaryIsConfigured } from "../../config/env";
import { AppError } from "../../utils/AppError";

if (cloudinaryIsConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
  format?: string;
}

/** Uploads a buffer into an organization-scoped Cloudinary folder so tenants can never see each other's media. */
export function uploadBuffer(buffer: Buffer, organizationId: string, resourceType: "image" | "video" | "raw" | "auto" = "auto"): Promise<UploadResult> {
  if (!cloudinaryIsConfigured) {
    throw AppError.badRequest("Cloudinary is not configured on this deployment. Set CLOUDINARY_* environment variables.", "CLOUDINARY_NOT_CONFIGURED");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `cymor/organizations/${organizationId}`, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteAsset(publicId: string, resourceType: "image" | "video" | "raw" = "image") {
  if (!cloudinaryIsConfigured) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
