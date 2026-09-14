import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { getPlaceController, getRouteController, searchPlacesController } from "./place-route.controller";

const router = Router();
router.use(authMiddleware);
router.get("/search", searchPlacesController);
router.get("/places/:id", getPlaceController);
router.post("/route", getRouteController);

export default router;
