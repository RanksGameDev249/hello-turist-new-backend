import { Router } from "express";

import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { decideVerification, updateUserRoleVerification } from "./admin.controller";
import { decideVerificationRequest, getVerificationRequestById, getVerificationRequests } from "./verification.controller";

const router = Router();

router.get("/verification/requests", authMiddleware, adminMiddleware, getVerificationRequests);
router.get("/verification/requests/:id", authMiddleware, adminMiddleware, getVerificationRequestById);
router.patch("/users/:userId/roles/:role", authMiddleware, adminMiddleware, updateUserRoleVerification);
router.patch("/verification/requests/:id", authMiddleware, adminMiddleware, decideVerificationRequest);

export default router;
