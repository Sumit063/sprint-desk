import { Router } from "express";
import bcrypt from "bcryptjs";
import { RefreshTokenModel } from "../models/RefreshToken";
import { UserModel } from "../models/User";
import {
  refreshCookieName,
  refreshCookieOptions
} from "../config";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  refreshTokenExpiresAt
} from "../utils/tokens";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, name, password } = req.body ?? {};

  if (!email || !name || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const existing = await UserModel.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await UserModel.create({
    email: String(email).toLowerCase(),
    name: String(name),
    passwordHash
  });

  const refreshToken = createRefreshToken();
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiresAt()
  });

  const accessToken = createAccessToken(user._id.toString());
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);

  return res.status(201).json({
    accessToken,
    user: { id: user._id, email: user.email, name: user.name }
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  const user = await UserModel.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(String(password), user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const refreshToken = createRefreshToken();
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiresAt()
  });

  const accessToken = createAccessToken(user._id.toString());
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);

  return res.json({
    accessToken,
    user: { id: user._id, email: user.email, name: user.name }
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[refreshCookieName];
  if (!token) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  const tokenHash = hashToken(String(token));
  const stored = await RefreshTokenModel.findOne({ tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: "Refresh token invalid" });
  }

  const user = await UserModel.findById(stored.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  stored.revokedAt = new Date();
  await stored.save();

  const newRefresh = createRefreshToken();
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(newRefresh),
    expiresAt: refreshTokenExpiresAt()
  });

  const accessToken = createAccessToken(user._id.toString());
  res.cookie(refreshCookieName, newRefresh, refreshCookieOptions);

  return res.json({
    accessToken,
    user: { id: user._id, email: user.email, name: user.name }
  });
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.[refreshCookieName];
  if (token) {
    const tokenHash = hashToken(String(token));
    await RefreshTokenModel.updateOne(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  res.clearCookie(refreshCookieName, { path: "/" });
  return res.json({ ok: true });
});

export default router;
