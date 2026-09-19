import { z } from "zod";

export const adRewardSchema = z.object({
  impressionId: z.string().min(8).max(120),
  proof: z.string().max(2048).optional(),
});
export const redeemSchema = z.object({ code: z.string().trim().min(4).max(80) });
export const walletConfigSchema = z.object({
  coinsPerAd: z.number().int().min(1).max(100),
  minRedeemCoins: z.number().int().min(0).max(1_000_000),
  redeemEnabled: z.boolean(),
  monthlyPassCodeEnabled: z.boolean(),
  monthlyPassTerms: z.string().min(10).max(5000),
});
export const createRedeemCodeSchema = z.object({
  code: z.string().trim().min(6).max(80),
  type: z.enum(["COIN_REWARD", "MONTHLY_PASS"]),
  coinCost: z.number().int().min(0).optional(),
  passMonths: z.number().int().min(1).max(12).optional(),
  terms: z.string().max(5000).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type AdRewardInput = z.infer<typeof adRewardSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
export type WalletConfigInput = z.infer<typeof walletConfigSchema>;
export type CreateRedeemCodeInput = z.infer<typeof createRedeemCodeSchema>;
