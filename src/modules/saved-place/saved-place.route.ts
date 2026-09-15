import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import {
  createSavedPlaceController,
  deleteSavedPlaceController,
  getSavedPlaceController,
  listSavedPlacesController,
  updateSavedPlaceController,
} from "./saved-place.controller";

const router = Router();
router.use(authMiddleware);

router.post("/", createSavedPlaceController);
router.get("/", listSavedPlacesController);
router.get("/:id", getSavedPlaceController);
router.patch("/:id", updateSavedPlaceController);
router.delete("/:id", deleteSavedPlaceController);

export default router;
