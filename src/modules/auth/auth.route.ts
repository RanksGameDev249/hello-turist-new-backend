import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  deleteAccount,
} from "./auth.controller";
import { googleSignIn, firebasePhoneAuth } from "./social-auth.controller";
import { authMiddleware } from "../../middleware/auth";
import { redisRateLimit } from "../../middleware/rate-limit";

const router = Router();

const authAttemptLimit = redisRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 10,
  keyPrefix: "rl:auth",
});

const refreshLimit = redisRateLimit({
  windowSeconds: 15 * 60,
  maxRequests: 30,
  keyPrefix: "rl:refresh",
});

router.post("/register", authAttemptLimit, register);
router.post("/login", authAttemptLimit, login);
router.post("/google", authAttemptLimit, googleSignIn);
router.post("/firebase/phone", authAttemptLimit, firebasePhoneAuth);
router.post("/refresh", refreshLimit, refresh);
router.post("/logout", authMiddleware, logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.delete("/account", authMiddleware, deleteAccount);
export default router;
