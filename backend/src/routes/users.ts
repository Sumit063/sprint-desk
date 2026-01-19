import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { UserModel } from "../models/User";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.userId).select("email name");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    user: { id: user._id, email: user.email, name: user.name }
  });
});

export default router;
