import { Schema, model, Document, Types } from "mongoose";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timezone: { type: String, default: "Africa/Nairobi" },
  },
  { timestamps: true }
);

export const Organization = model<IOrganization>("Organization", organizationSchema);
