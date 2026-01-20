import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { ActivityModel } from "../models/Activity";
import { CommentModel } from "../models/Comment";
import { IssueModel } from "../models/Issue";
import { MembershipModel } from "../models/Membership";

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

  return res.status(201).json({ comment: populated });
});

export default router;
