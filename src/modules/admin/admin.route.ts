import { Router } from "express";

import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { decideVerification, updateUserRoleVerification } from "./admin.controller";
import { decideVerificationRequest, getVerificationRequestById, getVerificationRequests } from "./verification.controller";
import { getPeople, getPersonById } from "./people.controller";
import { getBrandingController, updateBrandingController } from "./branding.controller";

const router = Router();

router.get("/verification/requests", authMiddleware, adminMiddleware, getVerificationRequests);
router.get("/verification/requests/:id", authMiddleware, adminMiddleware, getVerificationRequestById);
router.get("/people", authMiddleware, adminMiddleware, getPeople);
router.get("/people/:id", authMiddleware, adminMiddleware, getPersonById);
router.patch("/users/:userId/roles/:role", authMiddleware, adminMiddleware, updateUserRoleVerification);
router.patch("/verification/requests/:id", authMiddleware, adminMiddleware, decideVerificationRequest);
router.get("/branding", authMiddleware, adminMiddleware, getBrandingController);
router.patch("/branding", authMiddleware, adminMiddleware, updateBrandingController);

export default router;
