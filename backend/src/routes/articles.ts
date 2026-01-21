import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceMember, requireWorkspaceRole } from "../middleware/workspace";
import { validateBody } from "../middleware/validate";
import { ArticleModel } from "../models/Article";
import { WorkspaceModel } from "../models/Workspace";

const router = Router({ mergeParams: true });

const articleSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(""),
  linkedIssueIds: z.array(z.string()).optional().default([])
});

const updateSchema = articleSchema.partial();

router.use(requireAuth);
router.use(requireWorkspaceMember);

const ensureKbId = async (article: any) => {
  if (article.kbId) {
    return article;
  }

  const workspace = await WorkspaceModel.findOneAndUpdate(
    { _id: article.workspaceId },
    { $inc: { kbCounter: 1 } },
    { new: true }
  );

  if (!workspace || !workspace.key) {
    return article;
  }

  const kbId = `${workspace.key}-KB-${workspace.kbCounter}`;
  await ArticleModel.updateOne({ _id: article._id }, { $set: { kbId } });
  article.kbId = kbId;
  return article;
};

router.get("/", async (req, res) => {
  const filter: Record<string, unknown> = { workspaceId: req.workspaceId };
  if (req.query.issueId) {
    filter.linkedIssueIds = req.query.issueId;
  }

  const articles = await ArticleModel.find(filter)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email avatarUrl")
    .populate("updatedBy", "name email avatarUrl");

  const ensuredArticles = await Promise.all(articles.map((article) => ensureKbId(article)));

  return res.json({ articles: ensuredArticles });
});

router.post(
  "/",
  requireWorkspaceRole(["OWNER", "ADMIN", "MEMBER"]),
  validateBody(articleSchema),
  async (req, res) => {
    const workspace = await WorkspaceModel.findOneAndUpdate(
      { _id: req.workspaceId },
      { $inc: { kbCounter: 1 } },
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!workspace.key) {
      return res.status(400).json({ message: "Workspace key missing" });
    }

    const kbId = `${workspace.key}-KB-${workspace.kbCounter}`;

    const article = await ArticleModel.create({
      workspaceId: req.workspaceId,
      createdBy: req.userId,
      updatedBy: req.userId,
      kbId,
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
  })
    .populate("createdBy", "name email avatarUrl")
    .populate("updatedBy", "name email avatarUrl");

  if (!article) {
    return res.status(404).json({ message: "Article not found" });
  }

  const ensured = await ensureKbId(article);

  return res.json({ article: ensured });
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

    if (!article.kbId) {
      const workspace = await WorkspaceModel.findOneAndUpdate(
        { _id: req.workspaceId },
        { $inc: { kbCounter: 1 } },
        { new: true }
      );

      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      if (!workspace.key) {
        return res.status(400).json({ message: "Workspace key missing" });
      }

      article.kbId = `${workspace.key}-KB-${workspace.kbCounter}`;
    }

    if (req.body.title !== undefined) article.title = req.body.title;
    if (req.body.body !== undefined) article.body = req.body.body;
    if (req.body.linkedIssueIds !== undefined) {
      article.linkedIssueIds = req.body.linkedIssueIds;
    }
    article.updatedBy = req.userId;

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
