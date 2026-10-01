import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { idempotencyMiddleware } from "../../middleware/idempotency";
import { addMessageController, createTicketController, getTicketController, listTicketsController } from "./support.controller";

const router = Router();
router.use(authMiddleware);
router.post("/", idempotencyMiddleware(), createTicketController);
router.get("/", listTicketsController);
router.get("/:id", getTicketController);
router.post("/:id/messages", idempotencyMiddleware(), addMessageController);
export default router;
