import crypto from "crypto";
import jwt from "jsonwebtoken";
import { accessTokenTtlMinutes, jwtSecret, refreshTokenTtlDays } from "../config";

export function createAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, jwtSecret, {
    expiresIn: `${accessTokenTtlMinutes}m`
  });
}

export function createRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiresAt() {
  const ms = refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}
