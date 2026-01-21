import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middleware/workspace";
import { validateBody } from "../middleware/validate";
import { ActivityModel } from "../models/Activity";
import { IssueModel, issuePriorities, issueStatuses } from "../models/Issue";
import { NotificationModel } from "../models/Notification";
import { WorkspaceModel } from "../models/Workspace";
import { emitUserEvent, emitWorkspaceEvent } from "../socket";

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

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

router.use(requireAuth);
router.use(requireWorkspaceMember);

router.get("/", async (req, res) => {
  const status = req.query.status;
  const priority = req.query.priority;
  const assigneeId = req.query.assigneeId;
  const ticketId = req.query.ticketId;
  const page = parseNumber(req.query.page, 1);
  const limit = Math.min(parseNumber(req.query.limit, 20), 50);

  const filters: Record<string, unknown> = {
    workspaceId: req.workspaceId
  };

  if (typeof status === "string" && issueStatuses.includes(status as any)) {
    filters.status = status;
  }

  if (typeof priority === "string" && issuePriorities.includes(priority as any)) {
    filters.priority = priority;
  }

  if (typeof assigneeId === "string" && assigneeId.length > 0) {
    filters.assigneeId = assigneeId;
  }

  if (typeof ticketId === "string" && ticketId.length > 0) {
    filters.ticketId = ticketId.toUpperCase();
  }

  const total = await IssueModel.countDocuments(filters);
  const issues = await IssueModel.find(filters)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("assigneeId", "name email avatarUrl")
    .populate("createdBy", "name email avatarUrl");

  return res.json({
    issues,
    pagination: {
      page,
      limit,
      total
    }
  });
});

router.post(
  "/",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  validateBody(createIssueSchema),
  async (req, res) => {
    const workspace = await WorkspaceModel.findOneAndUpdate(
      { _id: req.workspaceId },
      { $inc: { issueCounter: 1 } },
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!workspace.key) {
      return res.status(400).json({ message: "Workspace key missing" });
    }

    const ticketId = `${workspace.key}-${workspace.issueCounter}`;

    const issue = await IssueModel.create({
      workspaceId: req.workspaceId,
      createdBy: req.userId,
      ticketId,
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

    emitWorkspaceEvent(req.workspaceId, "issue_created", {
      issueId: issue._id.toString(),
      title: issue.title,
      actorId: req.userId
    });

    if (issue.assigneeId && issue.assigneeId.toString() !== req.userId) {
      const notification = await NotificationModel.create({
        userId: issue.assigneeId,
        workspaceId: req.workspaceId,
        issueId: issue._id,
        type: "assigned",
        message: `You were assigned to issue \"${issue.title}\"`
      });
      emitUserEvent(issue.assigneeId.toString(), "notification_created", {
        notificationId: notification._id.toString(),
        message: notification.message
      });
    }

    return res.status(201).json({ issue });
  }
);

router.get("/:issueId", async (req, res) => {
  const issue = await IssueModel.findOne({
    _id: req.params.issueId,
    workspaceId: req.workspaceId
  })
    .populate("assigneeId", "name email avatarUrl")
    .populate("createdBy", "name email avatarUrl");

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
    const previousAssignee = issue.assigneeId?.toString() ?? null;
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

      emitWorkspaceEvent(req.workspaceId, "issue_updated", {
        issueId: issue._id.toString(),
        fields,
        actorId: req.userId
      });
    }

    const newAssignee = issue.assigneeId?.toString() ?? null;
    if (
      updates.assigneeId !== undefined &&
      newAssignee &&
      newAssignee !== previousAssignee &&
      newAssignee !== req.userId
    ) {
      const notification = await NotificationModel.create({
        userId: issue.assigneeId,
        workspaceId: req.workspaceId,
        issueId: issue._id,
        type: "assigned",
        message: `You were assigned to issue \"${issue.title}\"`
      });
      emitUserEvent(newAssignee, "notification_created", {
        notificationId: notification._id.toString(),
        message: notification.message
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
