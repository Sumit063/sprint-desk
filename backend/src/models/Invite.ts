import { Schema, model, type InferSchemaType } from "mongoose";

const inviteSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    code: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Invite = InferSchemaType<typeof inviteSchema>;

export const InviteModel = model("Invite", inviteSchema);
