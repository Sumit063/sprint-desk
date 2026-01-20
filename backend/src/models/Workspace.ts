import { Schema, model, type InferSchemaType } from "mongoose";

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Workspace = InferSchemaType<typeof workspaceSchema>;

export const WorkspaceModel = model("Workspace", workspaceSchema);
