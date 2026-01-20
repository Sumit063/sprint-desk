import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { InviteModel } from "./models/Invite";
import { MembershipModel } from "./models/Membership";
import { UserModel } from "./models/User";
import { WorkspaceModel } from "./models/Workspace";

dotenv.config();

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017/sprintdesk";

const createUser = async (email: string, name: string, password: string) => {
  const existing = await UserModel.findOne({ email });
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return UserModel.create({ email, name, passwordHash });
};

const run = async () => {
  await mongoose.connect(mongoUrl);

  const owner = await createUser("demo@sprintdesk.dev", "Demo Owner", "demo1234");
  const member = await createUser("member@sprintdesk.dev", "Demo Member", "demo1234");

  let workspace = await WorkspaceModel.findOne({
    name: "Demo Workspace",
    ownerId: owner._id
  });

  if (!workspace) {
    workspace = await WorkspaceModel.create({
      name: "Demo Workspace",
      ownerId: owner._id
    });
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
  } else {
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
  } else {
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
      code: "DEMO1234",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: owner._id
    });
  }

  console.log("Seed data ready:");
  console.log("Owner:", owner.email, "password: demo1234");
  console.log("Member:", member.email, "password: demo1234");
  console.log("Workspace:", workspace.name);
  console.log("Invite code:", invite.code);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
