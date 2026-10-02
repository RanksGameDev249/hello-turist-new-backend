import { Router } from "express";
import { publicSharedTripController } from "./shared-trip.controller";
const router=Router(); router.get("/:shareId",publicSharedTripController); export default router;