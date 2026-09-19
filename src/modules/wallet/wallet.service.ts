import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../core/prisma";
import type { AdRewardInput, CreateRedeemCodeInput, WalletConfigInput } from "./wallet.schema";

const configSql = Prisma.sql;

export async function getWallet(userId: string) {
  await prisma.$executeRaw`INSERT INTO wallet_accounts (user_id) VALUES (${userId}::uuid) ON CONFLICT (user_id) DO NOTHING`;
  const rows = await prisma.$queryRaw<Array<{ balance_coins: number }>>`SELECT balance_coins FROM wallet_accounts WHERE user_id=${userId}::uuid`;
  const passes = await prisma.$queryRaw<Array<{ id: string; starts_at: Date; expires_at: Date }>>`SELECT id, starts_at, expires_at FROM wallet_monthly_passes WHERE user_id=${userId}::uuid AND expires_at > NOW() ORDER BY expires_at DESC`;
  return { balanceCoins: rows[0]?.balance_coins ?? 0, activeMonthlyPasses: passes };
}

export async function rewardAdView(userId: string, input: AdRewardInput) {
  const config = await getConfig();
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO wallet_accounts (user_id) VALUES (${userId}::uuid) ON CONFLICT (user_id) DO NOTHING`;
    const inserted = await tx.$queryRaw<Array<{ id: string }>>`INSERT INTO wallet_ad_impressions (user_id, impression_id, reward_coins) VALUES (${userId}::uuid, ${input.impressionId}, ${config.coinsPerAd}) ON CONFLICT (impression_id) DO NOTHING RETURNING id`;
    if (!inserted[0]) throw new Error("AD_ALREADY_REWARDED");
    const updated = await tx.$queryRaw<Array<{ balance_coins: number }>>`UPDATE wallet_accounts SET balance_coins=balance_coins+${config.coinsPerAd}, updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;
    await tx.$executeRaw`INSERT INTO wallet_ledger (user_id,wallet_id,amount_coins,balance_after,type,reference_id,metadata) SELECT ${userId}::uuid,id,${config.coinsPerAd},balance_coins,'AD_VIEW',${input.impressionId},${JSON.stringify({ proof: input.proof ?? null })}::jsonb FROM wallet_accounts WHERE user_id=${userId}::uuid`;
    return updated[0]?.balance_coins ?? 0;
  });
  return { rewardedCoins: config.coinsPerAd, balanceCoins: result };
}

export async function redeemCode(userId: string, code: string) {
  const config = await getConfig();
  if (!config.redeemEnabled) throw new Error("REDEEM_DISABLED");
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; type: string; coin_cost: number | null; pass_months: number | null; terms: string | null; expires_at: Date | null; redeemed_by: string | null }>>`SELECT id,type,coin_cost,pass_months,terms,expires_at,redeemed_by FROM wallet_redeem_codes WHERE code=${code} FOR UPDATE`;
    const item = rows[0];
    if (!item) throw new Error("INVALID_REDEEM_CODE");
    if (item.redeemed_by) throw new Error("CODE_ALREADY_REDEEMED");
    if (item.expires_at && item.expires_at <= new Date()) throw new Error("CODE_EXPIRED");
    if (item.type === "MONTHLY_PASS" && !config.monthlyPassCodeEnabled) throw new Error("MONTHLY_PASS_DISABLED");
    if (item.type === "COIN_REWARD") {
      const cost = item.coin_cost ?? 0;
      if (cost < config.minRedeemCoins) throw new Error("REDEEM_THRESHOLD_NOT_MET");
      await tx.$executeRaw`INSERT INTO wallet_accounts (user_id) VALUES (${userId}::uuid) ON CONFLICT (user_id) DO NOTHING`;
      const wallet = await tx.$queryRaw<Array<{ id: string; balance_coins: number }>>`SELECT id,balance_coins FROM wallet_accounts WHERE user_id=${userId}::uuid FOR UPDATE`;
      if ((wallet[0]?.balance_coins ?? 0) < cost) throw new Error("INSUFFICIENT_COINS");
      const updated = await tx.$queryRaw<Array<{ balance_coins: number }>>`UPDATE wallet_accounts SET balance_coins=balance_coins-${cost},updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;
      await tx.$executeRaw`INSERT INTO wallet_ledger (user_id,wallet_id,amount_coins,balance_after,type,reference_id) VALUES (${userId}::uuid,${wallet[0].id}::uuid,${-cost},${updated[0].balance_coins},'REDEEM',${item.id})`;
      await tx.$executeRaw`UPDATE wallet_redeem_codes SET redeemed_by=${userId}::uuid,redeemed_at=NOW() WHERE id=${item.id}::uuid`;
      return { type: item.type, balanceCoins: updated[0].balance_coins, terms: item.terms };
    }
    const months = item.pass_months ?? 1;
    const start = new Date();
    const expiry = new Date(start); expiry.setMonth(expiry.getMonth() + months);
    await tx.$executeRaw`INSERT INTO wallet_monthly_passes (user_id,code_id,starts_at,expires_at) VALUES (${userId}::uuid,${item.id}::uuid,${start},${expiry})`;
    await tx.$executeRaw`UPDATE wallet_redeem_codes SET redeemed_by=${userId}::uuid,redeemed_at=NOW() WHERE id=${item.id}::uuid`;
    return { type: item.type, startsAt: start, expiresAt: expiry, terms: item.terms ?? config.monthlyPassTerms };
  });
  return result;
}

export async function getConfig() {
  const rows = await prisma.$queryRaw<Array<{ coins_per_ad: number; min_redeem_coins: number; redeem_enabled: boolean; monthly_pass_code_enabled: boolean; monthly_pass_terms: string }>>`SELECT coins_per_ad,min_redeem_coins,redeem_enabled,monthly_pass_code_enabled,monthly_pass_terms FROM wallet_config LIMIT 1`;
  const c = rows[0];
  return c ? { coinsPerAd: c.coins_per_ad, minRedeemCoins: c.min_redeem_coins, redeemEnabled: c.redeem_enabled, monthlyPassCodeEnabled: c.monthly_pass_code_enabled, monthlyPassTerms: c.monthly_pass_terms } : { coinsPerAd: 1, minRedeemCoins: 100, redeemEnabled: false, monthlyPassCodeEnabled: true, monthlyPassTerms: "Monthly pass redemption is subject to availability and validity dates." };
}

export async function updateConfig(adminId: string, input: WalletConfigInput) {
  await prisma.$executeRaw`UPDATE wallet_config SET coins_per_ad=${input.coinsPerAd},min_redeem_coins=${input.minRedeemCoins},redeem_enabled=${input.redeemEnabled},monthly_pass_code_enabled=${input.monthlyPassCodeEnabled},monthly_pass_terms=${input.monthlyPassTerms},updated_by=${adminId}::uuid,updated_at=NOW()`;
  return getConfig();
}

export async function createRedeemCode(input: CreateRedeemCodeInput) {
  if (input.type === "COIN_REWARD" && !input.coinCost) throw new Error("COIN_COST_REQUIRED");
  if (input.type === "MONTHLY_PASS" && !input.passMonths) throw new Error("PASS_MONTHS_REQUIRED");
  await prisma.$executeRaw`INSERT INTO wallet_redeem_codes (code,type,coin_cost,pass_months,terms,expires_at) VALUES (${input.code},${input.type},${input.coinCost ?? null},${input.passMonths ?? null},${input.terms ?? null},${input.expiresAt ? new Date(input.expiresAt) : null})`;
  return { code: input.code, type: input.type };
}

export async function listRedeemCodes() {
  return prisma.$queryRaw`SELECT id,code,type,coin_cost AS "coinCost",pass_months AS "passMonths",terms,expires_at AS "expiresAt",redeemed_by AS "redeemedBy",redeemed_at AS "redeemedAt",created_at AS "createdAt" FROM wallet_redeem_codes ORDER BY created_at DESC LIMIT 500`;
}

export async function registerDevice(userId: string, token: string) {
  await prisma.$executeRaw`INSERT INTO notification_devices (user_id,fcm_token,last_seen_at,updated_at) VALUES (${userId}::uuid,${token},NOW(),NOW()) ON CONFLICT (fcm_token) DO UPDATE SET user_id=EXCLUDED.user_id,enabled=true,last_seen_at=NOW(),updated_at=NOW()`;
  return { registered: true };
}
