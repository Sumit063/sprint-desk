import { Schema, model, type InferSchemaType } from "mongoose";

const commentSchema = new Schema(
  {
    issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

commentSchema.index({ issueId: 1, createdAt: 1 });

export type Comment = InferSchemaType<typeof commentSchema>;

export const CommentModel = model("Comment", commentSchema);
