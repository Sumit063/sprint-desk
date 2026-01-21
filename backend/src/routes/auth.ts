import crypto from "crypto";
import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { RefreshTokenModel } from "../models/RefreshToken";
import { UserModel } from "../models/User";
import { authLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import {
  googleClientId,
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
const googleClient = new OAuth2Client(googleClientId);

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

const googleSchema = z.object({
  credential: z.string().min(1)
});

async function issueTokens(
  res: Response,
  user: { _id: { toString(): string }; email: string; name: string }
) {
  const refreshToken = createRefreshToken();
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiresAt()
  });

  const accessToken = createAccessToken(user._id.toString());
  res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);

  return {
    accessToken,
    user: { id: user._id, email: user.email, name: user.name }
  };
}

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

  const payload = await issueTokens(res, user);
  return res.status(201).json(payload);
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

  const payload = await issueTokens(res, user);
  return res.json(payload);
});

router.post("/google", validateBody(googleSchema), async (req, res) => {
  if (!googleClientId) {
    return res.status(500).json({ message: "Google auth not configured" });
  }

  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });
    const idPayload = ticket.getPayload();
    if (!idPayload?.email || !idPayload.sub) {
      return res.status(401).json({ message: "Google token invalid" });
    }

    if (idPayload.email_verified === false) {
      return res.status(401).json({ message: "Google email not verified" });
    }

    const email = idPayload.email.toLowerCase();
    let user = await UserModel.findOne({ googleId: idPayload.sub });

    if (!user) {
      user = await UserModel.findOne({ email });
      if (user) {
        if (user.googleId && user.googleId !== idPayload.sub) {
          return res.status(409).json({ message: "Google account already linked" });
        }

        if (!user.googleId) {
          user.googleId = idPayload.sub;
          if (!user.provider || user.provider === "local") {
            user.provider = "google";
          }
          await user.save();
        }
      }
    }

    if (!user) {
      const name = idPayload.name?.trim() || email.split("@")[0];
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await UserModel.create({
        email,
        name,
        passwordHash,
        provider: "google",
        googleId: idPayload.sub
      });
    }

    const payload = await issueTokens(res, user);
    return res.json(payload);
  } catch {
    return res.status(401).json({ message: "Google token invalid" });
  }
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
