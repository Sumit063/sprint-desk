import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middleware/workspace";
import { validateBody } from "../middleware/validate";
import { ActivityModel } from "../models/Activity";
import { IssueModel, issuePriorities, issueStatuses } from "../models/Issue";

const router = Router({ mergeParams: true });

const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  status: z.enum(issueStatuses).optional(),
  priority: z.enum(issuePriorities).optional(),
  labels: z.array(z.string()).optional().default([]),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable()
});

const updateIssueSchema = createIssueSchema.partial();

router.use(requireAuth);
router.use(requireWorkspaceMember);

router.get("/", async (req, res) => {
  const issues = await IssueModel.find({ workspaceId: req.workspaceId })
    .sort({ createdAt: -1 })
    .populate("assigneeId", "name email")
    .populate("createdBy", "name email");

  return res.json({ issues });
});

router.post(
  "/",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  validateBody(createIssueSchema),
  async (req, res) => {
    const issue = await IssueModel.create({
      workspaceId: req.workspaceId,
      createdBy: req.userId,
      title: req.body.title,
      description: req.body.description ?? "",
      status: req.body.status ?? "OPEN",
      priority: req.body.priority ?? "MEDIUM",
      labels: req.body.labels ?? [],
      assigneeId: req.body.assigneeId ?? null,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
    });

    await ActivityModel.create({
      workspaceId: req.workspaceId,
      issueId: issue._id,
      actorId: req.userId,
      action: "issue_created",
      meta: { title: issue.title }
    });

    return res.status(201).json({ issue });
  }
);

router.get("/:issueId", async (req, res) => {
  const issue = await IssueModel.findOne({
    _id: req.params.issueId,
    workspaceId: req.workspaceId
  })
    .populate("assigneeId", "name email")
    .populate("createdBy", "name email");

  if (!issue) {
    return res.status(404).json({ message: "Issue not found" });
  }

  return res.json({ issue });
});

router.patch(
  "/:issueId",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  validateBody(updateIssueSchema),
  async (req, res) => {
    const issue = await IssueModel.findOne({
      _id: req.params.issueId,
      workspaceId: req.workspaceId
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const updates = req.body;
    const fields = Object.keys(updates);

    if (updates.title !== undefined) issue.title = updates.title;
    if (updates.description !== undefined) issue.description = updates.description;
    if (updates.status !== undefined) issue.status = updates.status;
    if (updates.priority !== undefined) issue.priority = updates.priority;
    if (updates.labels !== undefined) issue.labels = updates.labels;
    if (updates.assigneeId !== undefined) issue.assigneeId = updates.assigneeId;
    if (updates.dueDate !== undefined) {
      issue.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }

    await issue.save();

    if (fields.length > 0) {
      await ActivityModel.create({
        workspaceId: req.workspaceId,
        issueId: issue._id,
        actorId: req.userId,
        action: "issue_updated",
        meta: { fields }
      });
    }

    return res.json({ issue });
  }
);

router.delete(
  "/:issueId",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  async (req, res) => {
    const issue = await IssueModel.findOne({
      _id: req.params.issueId,
      workspaceId: req.workspaceId
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    await issue.deleteOne();

    await ActivityModel.create({
      workspaceId: req.workspaceId,
      issueId: issue._id,
      actorId: req.userId,
      action: "issue_deleted",
      meta: { title: issue.title }
    });

    return res.json({ ok: true });
  }
);

export default router;
