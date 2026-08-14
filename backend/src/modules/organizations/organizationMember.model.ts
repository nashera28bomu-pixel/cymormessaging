import { Schema, model, Document, Types } from "mongoose";

export const ORG_ROLES = ["OWNER", "ADMIN", "DEVELOPER", "AGENT", "ANALYST"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type MemberStatus = "INVITED" | "ACTIVE" | "REMOVED";

export interface IOrganizationMember extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrgRole;
  status: MemberStatus;
  invitedByUserId?: Types.ObjectId;
  invitedEmail?: string;
  inviteTokenHash?: string;
  inviteExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ORG_ROLES, required: true, default: "AGENT" },
    status: { type: String, enum: ["INVITED", "ACTIVE", "REMOVED"], default: "ACTIVE" },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    invitedEmail: { type: String, lowercase: true, trim: true },
    inviteTokenHash: { type: String, select: false },
    inviteExpiresAt: { type: Date },
  },
  { timestamps: true }
);

// A user can only have one membership record per organization.
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const OrganizationMember = model<IOrganizationMember>("OrganizationMember", organizationMemberSchema);
