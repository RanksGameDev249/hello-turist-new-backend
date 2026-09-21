import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  deleteNotificationController,
  getNotificationController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "./notification.controller";
import {
  listNotificationDevicesController,
  registerNotificationDeviceController,
  unregisterNotificationDeviceController,
} from "./device.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", listNotificationsController);
router.patch("/read-all", markAllNotificationsReadController);
router.post("/devices", registerNotificationDeviceController);
router.get("/devices", listNotificationDevicesController);
router.delete("/devices", unregisterNotificationDeviceController);
router.get("/:id", getNotificationController);
router.patch("/:id/read", markNotificationReadController);
router.delete("/:id", deleteNotificationController);

export default router;
