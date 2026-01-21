import dotenv from "dotenv";
import mongoose from "mongoose";
import { seedDemoData } from "./seed/demoSeed";

dotenv.config();

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017/sprintdesk";

const run = async () => {
  await mongoose.connect(mongoUrl);

  const { owner, member, workspace, invite } = await seedDemoData();

  console.log("Seed data ready:");
  console.log("Owner:", owner.email);
  console.log("Member:", member.email);
  console.log("Workspace:", workspace.name);
  console.log("Invite code:", invite.code);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
