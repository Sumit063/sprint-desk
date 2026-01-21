import bcrypt from "bcryptjs";
import crypto from "crypto";
import { InviteModel } from "../models/Invite";
import { MembershipModel } from "../models/Membership";
import { UserModel } from "../models/User";
import { WorkspaceModel } from "../models/Workspace";

const demoOwnerEmail = "demo.owner@sprintdesk.dev";
const demoMemberEmail = "demo.member@sprintdesk.dev";
const demoWorkspaceName = "Demo Workspace";
const demoWorkspaceKey = "DEMO";
const demoInviteCode = "DEMO1234";

const createUser = async (email: string, name: string) => {
  const existing = await UserModel.findOne({ email });
  if (existing) {
    if (!existing.provider || existing.provider !== "demo") {
      existing.provider = "demo";
      await existing.save();
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  return UserModel.create({ email, name, passwordHash, provider: "demo" });
};

export async function seedDemoData() {
  const owner = await createUser(demoOwnerEmail, "Demo Owner");
  const member = await createUser(demoMemberEmail, "Demo Member");

  let workspace = await WorkspaceModel.findOne({
    name: demoWorkspaceName,
    ownerId: owner._id
  });

  if (!workspace) {
    workspace = await WorkspaceModel.create({
      name: demoWorkspaceName,
      ownerId: owner._id,
      key: demoWorkspaceKey
    });
  } else if (!workspace.key) {
    workspace.key = demoWorkspaceKey;
    await workspace.save();
  }

  const ownerMembership = await MembershipModel.findOne({
    workspaceId: workspace._id,
    userId: owner._id
  });

  if (!ownerMembership) {
    await MembershipModel.create({
      workspaceId: workspace._id,
      userId: owner._id,
      role: "OWNER"
    });
  } else if (ownerMembership.role !== "OWNER") {
    ownerMembership.role = "OWNER";
    await ownerMembership.save();
  }

  const memberMembership = await MembershipModel.findOne({
    workspaceId: workspace._id,
    userId: member._id
  });

  if (!memberMembership) {
    await MembershipModel.create({
      workspaceId: workspace._id,
      userId: member._id,
      role: "MEMBER"
    });
  } else if (memberMembership.role !== "MEMBER") {
    memberMembership.role = "MEMBER";
    await memberMembership.save();
  }

  let invite = await InviteModel.findOne({
    workspaceId: workspace._id,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!invite) {
    invite = await InviteModel.create({
      workspaceId: workspace._id,
      code: demoInviteCode,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: owner._id
    });
  }

  return { owner, member, workspace, invite };
}
