import { Schema, model, type InferSchemaType } from "mongoose";

export const workspaceRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

const membershipSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: workspaceRoles, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export type Membership = InferSchemaType<typeof membershipSchema>;

export const MembershipModel = model("Membership", membershipSchema);
