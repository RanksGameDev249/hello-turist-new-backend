import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getPlaceController, getRouteController, searchPlacesController } from "./place-route.controller";

/**
 * API-contract routes from 05_API_SPECIFICATION.md.
 * Kept separate from the legacy /maps routes for backward compatibility.
 */
const router = Router();
router.use(authMiddleware);

router.get("/places/autocomplete", searchPlacesController);
router.get("/places/details", getPlaceController);
router.post("/routes/estimate", getRouteController);

export default router;
