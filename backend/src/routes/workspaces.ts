import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  requireWorkspaceMember,
  requireWorkspaceRole
} from "../middleware/workspace";
import { validateBody } from "../middleware/validate";
import { InviteModel } from "../models/Invite";
import { ArticleModel } from "../models/Article";
import { IssueModel } from "../models/Issue";
import { MembershipModel, workspaceRoles } from "../models/Membership";
import { UserModel } from "../models/User";
import { WorkspaceModel } from "../models/Workspace";

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(2).max(10).regex(/^[A-Za-z0-9]+$/)
});

const joinWorkspaceSchema = z.object({
  code: z.string().min(4)
});

const updateRoleSchema = z.object({
  role: z.enum(workspaceRoles)
});

router.use(requireAuth);

router.post("/join", validateBody(joinWorkspaceSchema), async (req, res) => {
  const { code } = req.body;
  const invite = await InviteModel.findOne({ code });

  if (!invite || invite.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invite invalid or expired" });
  }

  const workspace = await WorkspaceModel.findById(invite.workspaceId);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  let membership = await MembershipModel.findOne({
    workspaceId: invite.workspaceId,
    userId: req.userId
  });

  if (!membership) {
    membership = await MembershipModel.create({
      workspaceId: invite.workspaceId,
      userId: req.userId,
      role: "MEMBER"
    });
  }

  return res.json({
    workspace: { id: workspace._id, name: workspace.name, key: workspace.key },
    role: membership.role
  });
});

router.post("/", validateBody(createWorkspaceSchema), async (req, res) => {
  const normalizedKey = req.body.key.toUpperCase();
  const existingKey = await WorkspaceModel.findOne({ key: normalizedKey });
  if (existingKey) {
    return res.status(409).json({ message: "Workspace key already in use" });
  }

  const workspace = await WorkspaceModel.create({
    name: req.body.name,
    ownerId: req.userId,
    key: normalizedKey
  });

  await MembershipModel.create({
    workspaceId: workspace._id,
    userId: req.userId,
    role: "OWNER"
  });

  return res.status(201).json({
    workspace: { id: workspace._id, name: workspace.name, key: workspace.key },
    role: "OWNER"
  });
});

router.get("/", async (req, res) => {
  const memberships = await MembershipModel.find({ userId: req.userId }).populate(
    "workspaceId",
    "name ownerId key"
  );

  const workspaces = memberships
    .map((membership) => {
      const workspace = membership.workspaceId as {
        _id: string;
        name: string;
        ownerId: string;
        key?: string;
      } | null;

      if (!workspace) {
        return null;
      }

      return {
        id: workspace._id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        key: workspace.key,
        role: membership.role
      };
    })
    .filter(Boolean);

  return res.json({ workspaces });
});

router.get("/:id", requireWorkspaceMember, async (req, res) => {
  const workspace = await WorkspaceModel.findById(req.workspaceId);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  return res.json({
    workspace: {
      id: workspace._id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      key: workspace.key
    }
  });
});

router.post(
  "/:id/invite",
  requireWorkspaceMember,
  requireWorkspaceRole(["OWNER", "ADMIN"]),
  async (req, res) => {
    const code = crypto.randomBytes(4).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await InviteModel.create({
      workspaceId: req.workspaceId,
      code,
      expiresAt,
      createdBy: req.userId
    });

    const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:5173";

    return res.json({
      inviteCode: invite.code,
      inviteLink: `${appBaseUrl}/join?code=${invite.code}`,
      expiresAt: invite.expiresAt
    });
  }
);

router.patch(
  "/:id/members/:memberId",
  requireWorkspaceMember,
  requireWorkspaceRole(["OWNER"]),
  validateBody(updateRoleSchema),
  async (req, res) => {
    const membership = await MembershipModel.findOne({
      _id: req.params.memberId,
      workspaceId: req.workspaceId
    });

    if (!membership) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (membership.userId.toString() === req.userId && req.body.role !== "OWNER") {
      return res
        .status(400)
        .json({ message: "Owner cannot remove their own role" });
    }

    membership.role = req.body.role;
    await membership.save();

    return res.json({
      member: {
        id: membership._id,
        role: membership.role
      }
    });
  }
);

router.get("/:id/members", requireWorkspaceMember, async (req, res) => {
  const members = await MembershipModel.find({ workspaceId: req.workspaceId })
    .populate("userId", "name email avatarUrl contact")
    .sort({ createdAt: 1 });

  const results = members.map((member) => {
    const user = member.userId as {
      _id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
      contact?: string | null;
    } | null;
    return {
      id: member._id,
      role: member.role,
      user: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
            contact: user.contact ?? null
          }
        : { id: "", name: "", email: "" }
    };
  });

  return res.json({ members: results });
});

router.get("/:id/members/:memberId/overview", requireWorkspaceMember, async (req, res) => {
  const membership = await MembershipModel.findOne({
    _id: req.params.memberId,
    workspaceId: req.workspaceId
  });

  if (!membership) {
    return res.status(404).json({ message: "Member not found" });
  }

  const user = await UserModel.findById(membership.userId).select(
    "name email avatarUrl contact"
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const [issuesCreated, issuesAssigned, kbWorkedOnCount] = await Promise.all([
    IssueModel.countDocuments({ workspaceId: req.workspaceId, createdBy: user._id }),
    IssueModel.countDocuments({ workspaceId: req.workspaceId, assigneeId: user._id }),
    ArticleModel.countDocuments({
      workspaceId: req.workspaceId,
      $or: [{ createdBy: user._id }, { updatedBy: user._id }]
    })
  ]);

  const [recentIssuesCreated, recentIssuesAssigned, recentKbWorkedOn] =
    await Promise.all([
      IssueModel.find({ workspaceId: req.workspaceId, createdBy: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("ticketId title status priority"),
      IssueModel.find({ workspaceId: req.workspaceId, assigneeId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("ticketId title status priority"),
      ArticleModel.find({
        workspaceId: req.workspaceId,
        $or: [{ createdBy: user._id }, { updatedBy: user._id }]
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("kbId title updatedAt")
    ]);

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      contact: user.contact ?? null
    },
    stats: {
      issuesCreated,
      issuesAssigned,
      kbWorkedOn: kbWorkedOnCount
    },
    recent: {
      issuesCreated: recentIssuesCreated,
      issuesAssigned: recentIssuesAssigned,
      kbWorkedOn: recentKbWorkedOn
    }
  });
});

export default router;
