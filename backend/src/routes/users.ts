import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { UserModel } from "../models/User";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.userId).select("email name avatarUrl contact");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      contact: user.contact ?? null
    }
  });
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().max(2_000_000).nullable().optional(),
  contact: z.string().max(200).nullable().optional()
});

router.patch("/me", requireAuth, validateBody(updateProfileSchema), async (req, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl ?? null;
  if (req.body.contact !== undefined) user.contact = req.body.contact ?? null;
  await user.save();

  return res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      contact: user.contact ?? null
    }
  });
});

export default router;
