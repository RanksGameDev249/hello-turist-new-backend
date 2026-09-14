import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  createVehicleController,
  deleteVehicleController,
  getDriver,
  getGuide,
  listVehicleController,
  updateDriver,
  updateGuide,
  updateVehicleController,
} from "./provider.controller";

const router = Router();
router.use(authMiddleware);

router.get("/driver/profile", getDriver);
router.put("/driver/profile", updateDriver);
router.get("/guide/profile", getGuide);
router.put("/guide/profile", updateGuide);

router.post("/driver/vehicles", createVehicleController);
router.get("/driver/vehicles", listVehicleController);
router.patch("/driver/vehicles/:id", updateVehicleController);
router.delete("/driver/vehicles/:id", deleteVehicleController);

export default router;
