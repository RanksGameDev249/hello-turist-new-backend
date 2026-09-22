import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { RECOMMENDED_LANGUAGE_CODES, SUPPORTED_LANGUAGES } from "./language.catalog";

const router = Router();

router.get("/languages", (_req, res) => {
  res.json({ success: true, data: SUPPORTED_LANGUAGES, error: null });
});

router.get("/languages/recommended", (_req, res) => {
  const recommended = SUPPORTED_LANGUAGES.filter((language) => RECOMMENDED_LANGUAGE_CODES.includes(language.code));
  res.json({ success: true, data: recommended, error: null });
});

router.use(authMiddleware);

export default router;
