import { Schema, model, type InferSchemaType } from "mongoose";

export const issueStatuses = ["OPEN", "IN_PROGRESS", "DONE"] as const;
export const issuePriorities = ["LOW", "MEDIUM", "HIGH"] as const;

const issueSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ticketId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: issueStatuses, default: "OPEN" },
    priority: { type: String, enum: issuePriorities, default: "MEDIUM" },
    labels: [{ type: String }],
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    dueDate: { type: Date, default: null }
  },
  { timestamps: true }
);

issueSchema.index({ workspaceId: 1, createdAt: -1 });
issueSchema.index({ workspaceId: 1, status: 1 });
issueSchema.index({ workspaceId: 1, priority: 1 });
issueSchema.index({ workspaceId: 1, assigneeId: 1 });
issueSchema.index({ workspaceId: 1, ticketId: 1 }, { unique: true });

export type Issue = InferSchemaType<typeof issueSchema>;

export const IssueModel = model("Issue", issueSchema);
