import { Schema, model, Document, Types } from "mongoose";

export interface IMedia extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  uploadedByUserId: Types.ObjectId;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  mimeType: string;
  size: number;
  originalFilename: string;
  createdAt: Date;
}

const mediaSchema = new Schema<IMedia>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    originalFilename: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

mediaSchema.index({ organizationId: 1, createdAt: -1 });

export const Media = model<IMedia>("Media", mediaSchema);
