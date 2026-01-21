import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import { demoSeedOnStart } from "./config";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import workspacesRoutes from "./routes/workspaces";
import issuesRoutes from "./routes/issues";
import commentsRoutes from "./routes/comments";
import notificationsRoutes from "./routes/notifications";
import articlesRoutes from "./routes/articles";
import { seedDemoData } from "./seed/demoSeed";
import { initSocket } from "./socket";

dotenv.config();

const app = express();
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: corsOrigin.split(","),
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/workspaces", workspacesRoutes);
app.use("/api/workspaces/:id/issues", issuesRoutes);
app.use("/api/workspaces/:id/articles", articlesRoutes);
app.use("/api/issues/:issueId/comments", commentsRoutes);
app.use("/api/notifications", notificationsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "up" });
});

const port = Number(process.env.PORT ?? 4000);
const mongoUrl = process.env.MONGO_URL;

const start = async () => {
  if (mongoUrl) {
    await mongoose.connect(mongoUrl);
  } else {
    console.warn("MONGO_URL not set, skipping MongoDB connection");
  }

  if (mongoUrl && demoSeedOnStart) {
    try {
      await seedDemoData();
    } catch (error) {
      console.error("Demo seed failed", error);
    }
  }

  const server = createServer(app);
  initSocket(server, corsOrigin.split(","));

  server.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
