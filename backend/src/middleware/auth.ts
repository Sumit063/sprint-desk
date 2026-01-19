import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, jwtSecret) as { sub?: string };
    if (!payload.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
