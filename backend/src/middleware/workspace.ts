import type { RequestHandler } from "express";
import { MembershipModel, workspaceRoles } from "../models/Membership";

const roleRank: Record<(typeof workspaceRoles)[number], number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1
};

function getWorkspaceId(req: Parameters<RequestHandler>[0]) {
  return req.params.id ?? req.params.workspaceId;
}

export const requireWorkspaceMember: RequestHandler = async (req, res, next) => {
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId || !req.userId) {
    return res.status(400).json({ message: "Workspace id required" });
  }

  const membership = await MembershipModel.findOne({
    workspaceId,
    userId: req.userId
  });

  if (!membership) {
    return res.status(403).json({ message: "Forbidden" });
  }

  req.workspaceId = workspaceId;
  req.workspaceRole = membership.role;
  return next();
};

export function requireWorkspaceRole(roles: (typeof workspaceRoles)[number][]) {
  const minRank = Math.min(...roles.map((role) => roleRank[role]));
  return ((req, res, next) => {
    if (!req.workspaceRole) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (roleRank[req.workspaceRole] < minRank) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  }) satisfies RequestHandler;
}
