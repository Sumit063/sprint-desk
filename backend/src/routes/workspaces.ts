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
import { MembershipModel, workspaceRoles } from "../models/Membership";
import { WorkspaceModel } from "../models/Workspace";

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1)
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
    workspace: { id: workspace._id, name: workspace.name },
    role: membership.role
  });
});

router.post("/", validateBody(createWorkspaceSchema), async (req, res) => {
  const workspace = await WorkspaceModel.create({
    name: req.body.name,
    ownerId: req.userId
  });

  await MembershipModel.create({
    workspaceId: workspace._id,
    userId: req.userId,
    role: "OWNER"
  });

  return res.status(201).json({
    workspace: { id: workspace._id, name: workspace.name },
    role: "OWNER"
  });
});

router.get("/", async (req, res) => {
  const memberships = await MembershipModel.find({ userId: req.userId }).populate(
    "workspaceId",
    "name ownerId"
  );

  const workspaces = memberships
    .map((membership) => {
      const workspace = membership.workspaceId as {
        _id: string;
        name: string;
        ownerId: string;
      } | null;

      if (!workspace) {
        return null;
      }

      return {
        id: workspace._id,
        name: workspace.name,
        ownerId: workspace.ownerId,
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
      ownerId: workspace.ownerId
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
    .populate("userId", "name email")
    .sort({ createdAt: 1 });

  const results = members.map((member) => {
    const user = member.userId as { _id: string; name: string; email: string } | null;
    return {
      id: member._id,
      role: member.role,
      user: user
        ? { id: user._id, name: user.name, email: user.email }
        : { id: "", name: "", email: "" }
    };
  });

  return res.json({ members: results });
});

export default router;
