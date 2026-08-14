import { Request, Response } from "express";
import multer from "multer";
import { ok } from "../../utils/apiResponse";
import { AppError } from "../../utils/AppError";
import * as mediaService from "./media.service";

export const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

export async function upload(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest("No file provided", "FILE_REQUIRED");
  const media = await mediaService.uploadMedia({ organizationId: req.organizationId!, userId: req.userId!, file: req.file });
  return ok(res, media, 201);
}

export async function list(req: Request, res: Response) {
  const media = await mediaService.listMedia(req.organizationId!);
  return ok(res, media);
}

export async function remove(req: Request, res: Response) {
  await mediaService.deleteMedia(req.organizationId!, req.params.mediaId, req.userId!);
  return ok(res, { deleted: true });
}
