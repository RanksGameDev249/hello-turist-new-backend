import express from "express";
import dotenv from "dotenv";
import { requestIdMiddleware } from "./middleware/request-id";
import authRouter from "./modules/auth/auth.route";
import usersRouter from "./modules/users/users.route";
import adminRouter from "./modules/admin/admin.route";
import verificationRouter from "./modules/verification/verification.route";
import providerRouter from "./modules/provider/provider.route";
import { errorHandler } from "./middleware/error-handler";

dotenv.config();

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);

app.get("/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      status: "ok",
    },
    error: null,
    requestId: _req.requestId,
  });
});

// API v1
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/verification", verificationRouter);
app.use("/api/v1/providers", providerRouter);

app.use(errorHandler);

export default app;
