import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { NotificationModel } from "../models/Notification";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const filter: Record<string, unknown> = { userId: req.userId };
  if (unreadOnly) {
    filter.readAt = null;
  }

  const notifications = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({ notifications });
});

router.patch("/read-all", async (req, res) => {
  const now = new Date();
  const result = await NotificationModel.updateMany(
    { userId: req.userId, readAt: null },
    { readAt: now }
  );

  return res.json({ updated: result.modifiedCount });
});

router.patch("/:id/read", async (req, res) => {
  const notification = await NotificationModel.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  notification.readAt = new Date();
  await notification.save();

  return res.json({ notification });
});

export default router;
