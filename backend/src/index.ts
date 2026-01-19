import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";

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

  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
