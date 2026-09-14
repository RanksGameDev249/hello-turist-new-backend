import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { addMessageController, createTicketController, getTicketController, listTicketsController } from "./support.controller";

const router = Router();
router.use(authMiddleware);
router.post("/", createTicketController);
router.get("/", listTicketsController);
router.get("/:id", getTicketController);
router.post("/:id/messages", addMessageController);
export default router;
