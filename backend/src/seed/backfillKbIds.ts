import dotenv from "dotenv";
import mongoose from "mongoose";
import { ArticleModel } from "../models/Article";
import { WorkspaceModel } from "../models/Workspace";

dotenv.config();

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017/sprintdesk";

const run = async () => {
  await mongoose.connect(mongoUrl);

  const workspaces = await WorkspaceModel.find({});
  for (const workspace of workspaces) {
    if (!workspace.key) {
      console.log(`[skip] workspace ${workspace._id} missing key`);
      continue;
    }

    const missing = await ArticleModel.find({
      workspaceId: workspace._id,
      $or: [{ kbId: { $exists: false } }, { kbId: null }, { kbId: "" }]
    }).sort({ createdAt: 1 });

    if (missing.length === 0) {
      continue;
    }

    let counter = workspace.kbCounter ?? 0;
    for (const article of missing) {
      counter += 1;
      const kbId = `${workspace.key}-KB-${counter}`;
      await ArticleModel.updateOne({ _id: article._id }, { $set: { kbId } });
      console.log(`backfilled ${article._id} -> ${kbId}`);
    }

    if (counter !== workspace.kbCounter) {
      workspace.kbCounter = counter;
      await workspace.save();
    }
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("KB backfill failed", error);
  process.exit(1);
});
