import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  defaultOrganizationId?: Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date },
    defaultOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
