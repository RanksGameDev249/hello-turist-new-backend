import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  deleteNotificationController,
  getNotificationController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "./notification.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", listNotificationsController);
router.patch("/read-all", markAllNotificationsReadController);
router.get("/:id", getNotificationController);
router.patch("/:id/read", markNotificationReadController);
router.delete("/:id", deleteNotificationController);

export default router;
