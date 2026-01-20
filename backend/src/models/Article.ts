import { Schema, model, type InferSchemaType } from "mongoose";

const articleSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    linkedIssueIds: [{ type: Schema.Types.ObjectId, ref: "Issue" }]
  },
  { timestamps: true }
);

articleSchema.index({ workspaceId: 1, createdAt: -1 });

export type Article = InferSchemaType<typeof articleSchema>;

export const ArticleModel = model("Article", articleSchema);
