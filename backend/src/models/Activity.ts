import { Schema, model, type InferSchemaType } from "mongoose";

const activitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    issueId: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.index({ issueId: 1, createdAt: -1 });

export type Activity = InferSchemaType<typeof activitySchema>;

export const ActivityModel = model("Activity", activitySchema);
