import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { RefreshTokenModel } from "../models/RefreshToken";
import { UserModel } from "../models/User";
import { authLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
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

router.use(authLimiter);

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/register", validateBody(registerSchema), async (req, res) => {
  const { email, name, password } = req.body;

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    email: email.toLowerCase(),
    name,
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

router.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
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
