import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middleware/workspace";
import { validateBody } from "../middleware/validate";
import { ArticleModel } from "../models/Article";

const router = Router({ mergeParams: true });

const articleSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(""),
  linkedIssueIds: z.array(z.string()).optional().default([])
});

const updateSchema = articleSchema.partial();

router.use(requireAuth);
router.use(requireWorkspaceMember);

router.get("/", async (req, res) => {
  const filter: Record<string, unknown> = { workspaceId: req.workspaceId };
  if (req.query.issueId) {
    filter.linkedIssueIds = req.query.issueId;
  }

  const articles = await ArticleModel.find(filter)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email");

  return res.json({ articles });
});

router.post(
  "/",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  validateBody(articleSchema),
  async (req, res) => {
    const article = await ArticleModel.create({
      workspaceId: req.workspaceId,
      createdBy: req.userId,
      title: req.body.title,
      body: req.body.body ?? "",
      linkedIssueIds: req.body.linkedIssueIds ?? []
    });

    return res.status(201).json({ article });
  }
);

router.get("/:articleId", async (req, res) => {
  const article = await ArticleModel.findOne({
    _id: req.params.articleId,
    workspaceId: req.workspaceId
  }).populate("createdBy", "name email");

  if (!article) {
    return res.status(404).json({ message: "Article not found" });
  }

  return res.json({ article });
});

router.patch(
  "/:articleId",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  validateBody(updateSchema),
  async (req, res) => {
    const article = await ArticleModel.findOne({
      _id: req.params.articleId,
      workspaceId: req.workspaceId
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    if (req.body.title !== undefined) article.title = req.body.title;
    if (req.body.body !== undefined) article.body = req.body.body;
    if (req.body.linkedIssueIds !== undefined) {
      article.linkedIssueIds = req.body.linkedIssueIds;
    }

    await article.save();

    return res.json({ article });
  }
);

router.delete(
  "/:articleId",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  async (req, res) => {
    const article = await ArticleModel.findOne({
      _id: req.params.articleId,
      workspaceId: req.workspaceId
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    await article.deleteOne();
    return res.json({ ok: true });
  }
);

export default router;
