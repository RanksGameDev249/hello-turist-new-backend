import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import { walletController,rewardAdController,redeemController,registerDeviceController,getWalletConfigController,updateWalletConfigController,createRedeemCodeController,listRedeemCodesController } from "./wallet.controller";

const router=Router();
router.use(authMiddleware);
router.get("/",walletController);
router.post("/ad-reward",rewardAdController);
router.post("/redeem",redeemController);
router.post("/devices",registerDeviceController);
router.get("/config",adminMiddleware,getWalletConfigController);
router.patch("/config",adminMiddleware,updateWalletConfigController);
router.post("/redeem-codes",adminMiddleware,createRedeemCodeController);
router.get("/redeem-codes",adminMiddleware,listRedeemCodesController);
export default router;
