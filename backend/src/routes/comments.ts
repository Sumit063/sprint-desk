import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { ActivityModel } from "../models/Activity";
import { CommentModel } from "../models/Comment";
import { IssueModel } from "../models/Issue";
import { MembershipModel } from "../models/Membership";
import { NotificationModel } from "../models/Notification";
import { UserModel } from "../models/User";
import { emitUserEvent, emitWorkspaceEvent } from "../socket";

const router = Router({ mergeParams: true });

const createCommentSchema = z.object({
  body: z.string().min(1)
});

router.use(requireAuth);

const loadIssueForUser = async (issueId: string, userId: string) => {
  const issue = await IssueModel.findById(issueId);
  if (!issue) {
    return { issue: null, membership: null };
  }

  const membership = await MembershipModel.findOne({
    workspaceId: issue.workspaceId,
    userId
  });

  return { issue, membership };
};

router.get("/", async (req, res) => {
  const { issue, membership } = await loadIssueForUser(
    req.params.issueId,
    req.userId ?? ""
  );

  if (!issue || !membership) {
    return res.status(404).json({ message: "Issue not found" });
  }

  const comments = await CommentModel.find({ issueId: issue._id })
    .sort({ createdAt: 1 })
    .populate("userId", "name email");

  return res.json({ comments });
});

router.post("/", validateBody(createCommentSchema), async (req, res) => {
  const { issue, membership } = await loadIssueForUser(
    req.params.issueId,
    req.userId ?? ""
  );

  if (!issue || !membership) {
    return res.status(404).json({ message: "Issue not found" });
  }

  const comment = await CommentModel.create({
    issueId: issue._id,
    userId: req.userId,
    body: req.body.body
  });

  await ActivityModel.create({
    workspaceId: issue.workspaceId,
    issueId: issue._id,
    actorId: req.userId,
    action: "comment_added",
    meta: { commentId: comment._id }
  });

  const populated = await comment.populate("userId", "name email");

  emitWorkspaceEvent(issue.workspaceId.toString(), "comment_added", {
    issueId: issue._id.toString(),
    commentId: comment._id.toString(),
    actorId: req.userId
  });

  const mentionRegex = /@([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;
  const mentions = Array.from(req.body.body.matchAll(mentionRegex)).map((match) =>
    match[1].toLowerCase()
  );
  const uniqueMentions = Array.from(new Set(mentions));

  if (uniqueMentions.length > 0) {
    const users = await UserModel.find({ email: { $in: uniqueMentions } });
    const userIds = users.map((user) => user._id);
    const memberships = await MembershipModel.find({
      workspaceId: issue.workspaceId,
      userId: { $in: userIds }
    }).select("userId");
    const memberSet = new Set(memberships.map((member) => member.userId.toString()));

    await Promise.all(
      users
        .filter((user) => user._id.toString() !== req.userId)
        .filter((user) => memberSet.has(user._id.toString()))
        .map(async (user) => {
          const notification = await NotificationModel.create({
            userId: user._id,
            workspaceId: issue.workspaceId,
            issueId: issue._id,
            type: "mention",
            message: `You were mentioned in issue \"${issue.title}\"`
          });
          emitUserEvent(user._id.toString(), "notification_created", {
            notificationId: notification._id.toString(),
            message: notification.message
          });
        })
    );
  }

  return res.status(201).json({ comment: populated });
});

export default router;
