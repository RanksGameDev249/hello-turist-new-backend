import crypto from "node:crypto";
import { prisma } from "../../core/prisma";
import { calculateFare } from "../ride/fare.service";
import type { AdRewardInput, CreateRedeemCodeInput, WalletConfigInput } from "./wallet.schema";

export async function getWallet(userId:string){await prisma.$executeRaw`INSERT INTO wallet_accounts(user_id) VALUES(${userId}::uuid) ON CONFLICT(user_id) DO NOTHING`;const rows=await prisma.$queryRaw<Array<{balance_coins:number}>>`SELECT balance_coins FROM wallet_accounts WHERE user_id=${userId}::uuid`;const passes=await prisma.$queryRaw<Array<{id:string;starts_at:Date;expires_at:Date}>>`SELECT id,starts_at,expires_at FROM wallet_monthly_passes WHERE user_id=${userId}::uuid AND expires_at>NOW() ORDER BY expires_at DESC`;return{balanceCoins:rows[0]?.balance_coins??0,activeMonthlyPasses:passes}}
export async function rewardAdView(userId:string,input:AdRewardInput){const config=await getConfig();return prisma.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO wallet_accounts(user_id) VALUES(${userId}::uuid) ON CONFLICT(user_id) DO NOTHING`;const inserted=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO wallet_ad_impressions(user_id,impression_id,reward_coins) VALUES(${userId}::uuid,${input.impressionId},${config.coinsPerAd}) ON CONFLICT(impression_id) DO NOTHING RETURNING id`;if(!inserted[0])throw new Error("AD_ALREADY_REWARDED");const updated=await tx.$queryRaw<Array<{balance_coins:number}>>`UPDATE wallet_accounts SET balance_coins=balance_coins+${config.coinsPerAd},updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;await tx.$executeRaw`INSERT INTO wallet_ledger(user_id,wallet_id,amount_coins,balance_after,type,reference_id) SELECT ${userId}::uuid,id,${config.coinsPerAd},balance_coins,'AD_VIEW',${input.impressionId} FROM wallet_accounts WHERE user_id=${userId}::uuid`;return{rewardedCoins:config.coinsPerAd,balanceCoins:updated[0].balance_coins}})}

export async function rewardVerifiedAdView(userId:string, transactionId:string, rewardAmount:number, rewardItem:string){
  const config=await getConfig();
  if (!Number.isInteger(rewardAmount) || rewardAmount <= 0) throw new Error("INVALID_AD_REWARD_AMOUNT");
  if (rewardAmount !== config.coinsPerAd) throw new Error("AD_REWARD_AMOUNT_MISMATCH");
  if (!transactionId || transactionId.length > 255) throw new Error("INVALID_AD_TRANSACTION_ID");
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`INSERT INTO wallet_accounts(user_id) VALUES(${userId}::uuid) ON CONFLICT(user_id) DO NOTHING`;
    const inserted=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO wallet_ad_impressions(user_id,impression_id,reward_coins) VALUES(${userId}::uuid,${transactionId},${config.coinsPerAd}) ON CONFLICT(impression_id) DO NOTHING RETURNING id`;
    if(!inserted[0])throw new Error("AD_ALREADY_REWARDED");
    const updated=await tx.$queryRaw<Array<{balance_coins:number}>>`UPDATE wallet_accounts SET balance_coins=balance_coins+${config.coinsPerAd},updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;
    await tx.$executeRaw`INSERT INTO wallet_ledger(user_id,wallet_id,amount_coins,balance_after,type,reference_id) SELECT ${userId}::uuid,id,${config.coinsPerAd},balance_coins,'AD_VIEW',${transactionId} FROM wallet_accounts WHERE user_id=${userId}::uuid`;
    return{rewardedCoins:config.coinsPerAd,balanceCoins:updated[0].balance_coins,transactionId,rewardItem};
  });
}

let admobKeys:{keyId:string;pem:string}[]|null=null;let admobKeysExpiresAt=0;
async function getAdMobVerifierKeys(){
  if(admobKeys&&admobKeysExpiresAt>Date.now())return admobKeys;
  const response=await fetch("https://www.gstatic.com/admob/reward/verifier-keys.json");
  if(!response.ok)throw new Error("ADMOB_KEYS_UNAVAILABLE");
  const body=await response.json() as {keys?:Array<{keyId?:string|number;pem?:string}>};
  const keys=(body.keys??[]).filter(k=>k.keyId!==undefined&&typeof k.pem==="string").map(k=>({keyId:String(k.keyId),pem:k.pem!}));
  if(!keys.length)throw new Error("ADMOB_KEYS_UNAVAILABLE");
  admobKeys=keys;admobKeysExpiresAt=Date.now()+6*60*60*1000;return keys;
}

export async function verifyAdMobSsvAndReward(input:{rawQuery:string;signature:string;keyId:string;userId:string;transactionId:string;rewardAmount:number;rewardItem:string}){
  if(!input.rawQuery||!input.signature||!input.keyId)throw new Error("INVALID_ADMOB_SSV");
  const keys=await getAdMobVerifierKeys();
  const key=keys.find(k=>k.keyId===input.keyId);if(!key)throw new Error("ADMOB_KEY_NOT_FOUND");
  const signedQuery=input.rawQuery.split("&").filter(part=>{const keyName=part.split("=",1)[0];return keyName!=="signature"&&keyName!=="key_id";}).join("&");
  let signature:Buffer;try{signature=Buffer.from(input.signature,"base64url");}catch{throw new Error("INVALID_ADMOB_SIGNATURE");}
  const valid=crypto.verify("sha256",Buffer.from(signedQuery,"utf8"),{key:key.pem,dsaEncoding:"der"},signature);
  if(!valid)throw new Error("INVALID_ADMOB_SIGNATURE");
  return rewardVerifiedAdView(input.userId,input.transactionId,input.rewardAmount,input.rewardItem);
}

export async function redeemCode(userId:string,code:string){const config=await getConfig();if(!config.redeemEnabled)throw new Error("REDEEM_DISABLED");return prisma.$transaction(async tx=>{const rows=await tx.$queryRaw<Array<{id:string;type:string;coin_cost:number|null;pass_months:number|null;terms:string|null;expires_at:Date|null;redeemed_by:string|null}>>`SELECT id,type,coin_cost,pass_months,terms,expires_at,redeemed_by FROM wallet_redeem_codes WHERE code=${code} FOR UPDATE`;const item=rows[0];if(!item)throw new Error("INVALID_REDEEM_CODE");if(item.redeemed_by)throw new Error("CODE_ALREADY_REDEEMED");if(item.expires_at&&item.expires_at<=new Date())throw new Error("CODE_EXPIRED");if(item.type==="MONTHLY_PASS"&&!config.monthlyPassCodeEnabled)throw new Error("MONTHLY_PASS_DISABLED");if(item.type==="COIN_REWARD"){const cost=item.coin_cost??0;if(cost<config.minRedeemCoins)throw new Error("REDEEM_THRESHOLD_NOT_MET");await tx.$executeRaw`INSERT INTO wallet_accounts(user_id) VALUES(${userId}::uuid) ON CONFLICT(user_id) DO NOTHING`;const wallet=await tx.$queryRaw<Array<{id:string;balance_coins:number}>>`SELECT id,balance_coins FROM wallet_accounts WHERE user_id=${userId}::uuid FOR UPDATE`;if((wallet[0]?.balance_coins??0)<cost)throw new Error("INSUFFICIENT_COINS");const updated=await tx.$queryRaw<Array<{balance_coins:number}>>`UPDATE wallet_accounts SET balance_coins=balance_coins-${cost},updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;await tx.$executeRaw`INSERT INTO wallet_ledger(user_id,wallet_id,amount_coins,balance_after,type,reference_id) VALUES(${userId}::uuid,${wallet[0].id}::uuid,${-cost},${updated[0].balance_coins},'REDEEM',${item.id})`;await tx.$executeRaw`UPDATE wallet_redeem_codes SET redeemed_by=${userId}::uuid,redeemed_at=NOW() WHERE id=${item.id}::uuid`;return{type:item.type,balanceCoins:updated[0].balance_coins,terms:item.terms}}const months=item.pass_months??1;const start=new Date();const expiry=new Date(start);expiry.setMonth(expiry.getMonth()+months);await tx.$executeRaw`INSERT INTO wallet_monthly_passes(user_id,code_id,starts_at,expires_at) VALUES(${userId}::uuid,${item.id}::uuid,${start},${expiry})`;await tx.$executeRaw`UPDATE wallet_redeem_codes SET redeemed_by=${userId}::uuid,redeemed_at=NOW() WHERE id=${item.id}::uuid`;return{type:item.type,startsAt:start,expiresAt:expiry,terms:item.terms??config.monthlyPassTerms}})}
export async function buyMonthlyPass(userId:string){const config=await getConfig();if(!config.redeemEnabled)throw new Error("REDEEM_DISABLED");return prisma.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO wallet_accounts(user_id) VALUES(${userId}::uuid) ON CONFLICT(user_id) DO NOTHING`;const wallet=await tx.$queryRaw<Array<{id:string;balance_coins:number}>>`SELECT id,balance_coins FROM wallet_accounts WHERE user_id=${userId}::uuid FOR UPDATE`;if((wallet[0]?.balance_coins??0)<config.monthlyPassCoinCost)throw new Error("INSUFFICIENT_COINS");const updated=await tx.$queryRaw<Array<{balance_coins:number}>>`UPDATE wallet_accounts SET balance_coins=balance_coins-${config.monthlyPassCoinCost},updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;const start=new Date();const expiry=new Date(start);expiry.setMonth(expiry.getMonth()+1);const codeId=(await tx.$queryRaw<Array<{id:string}>>`INSERT INTO wallet_redeem_codes(code,type,pass_months,terms) VALUES(${`AUTO-${userId.slice(0,8)}-${Date.now()}`},'MONTHLY_PASS',1,${config.monthlyPassTerms}) RETURNING id`)[0].id;await tx.$executeRaw`INSERT INTO wallet_monthly_passes(user_id,code_id,starts_at,expires_at) VALUES(${userId}::uuid,${codeId}::uuid,${start},${expiry})`;await tx.$executeRaw`INSERT INTO wallet_ledger(user_id,wallet_id,amount_coins,balance_after,type,reference_id) VALUES(${userId}::uuid,${wallet[0].id}::uuid,${-config.monthlyPassCoinCost},${updated[0].balance_coins},'MONTHLY_PASS_PURCHASE',${codeId})`;return{balanceCoins:updated[0].balance_coins,startsAt:start,expiresAt:expiry,terms:config.monthlyPassTerms}})}
export async function getConfig(){const rows=await prisma.$queryRaw<Array<{coins_per_ad:number;min_redeem_coins:number;monthly_pass_coin_cost:number;redeem_enabled:boolean;monthly_pass_code_enabled:boolean;monthly_pass_terms:string}>>`SELECT coins_per_ad,min_redeem_coins,monthly_pass_coin_cost,redeem_enabled,monthly_pass_code_enabled,monthly_pass_terms FROM wallet_config LIMIT 1`;const c=rows[0];return c?{coinsPerAd:c.coins_per_ad,minRedeemCoins:c.min_redeem_coins,monthlyPassCoinCost:c.monthly_pass_coin_cost,redeemEnabled:c.redeem_enabled,monthlyPassCodeEnabled:c.monthly_pass_code_enabled,monthlyPassTerms:c.monthly_pass_terms}:{coinsPerAd:1,minRedeemCoins:100,monthlyPassCoinCost:500,redeemEnabled:false,monthlyPassCodeEnabled:true,monthlyPassTerms:"Monthly pass redemption is subject to availability and validity dates."}}
export async function updateConfig(adminId:string,input:WalletConfigInput){await prisma.$executeRaw`UPDATE wallet_config SET coins_per_ad=${input.coinsPerAd},min_redeem_coins=${input.minRedeemCoins},monthly_pass_coin_cost=${input.monthlyPassCoinCost},redeem_enabled=${input.redeemEnabled},monthly_pass_code_enabled=${input.monthlyPassCodeEnabled},monthly_pass_terms=${input.monthlyPassTerms},updated_by=${adminId}::uuid,updated_at=NOW()`;return getConfig()}
export async function createRedeemCode(input:CreateRedeemCodeInput){if(input.type==="COIN_REWARD"&&!input.coinCost)throw new Error("COIN_COST_REQUIRED");if(input.type==="MONTHLY_PASS"&&!input.passMonths)throw new Error("PASS_MONTHS_REQUIRED");await prisma.$executeRaw`INSERT INTO wallet_redeem_codes(code,type,coin_cost,pass_months,terms,expires_at) VALUES(${input.code},${input.type},${input.coinCost??null},${input.passMonths??null},${input.terms??null},${input.expiresAt?new Date(input.expiresAt):null})`;return{code:input.code,type:input.type}}
export async function listRedeemCodes(){return prisma.$queryRaw`SELECT id,code,type,coin_cost AS "coinCost",pass_months AS "passMonths",terms,expires_at AS "expiresAt",redeemed_by AS "redeemedBy",redeemed_at AS "redeemedAt",created_at AS "createdAt" FROM wallet_redeem_codes ORDER BY created_at DESC LIMIT 500`}
export async function registerDevice(userId:string,token:string){await prisma.$executeRaw`INSERT INTO notification_devices(user_id,fcm_token,last_seen_at,updated_at) VALUES(${userId}::uuid,${token},NOW(),NOW()) ON CONFLICT(fcm_token) DO UPDATE SET user_id=EXCLUDED.user_id,enabled=true,last_seen_at=NOW(),updated_at=NOW()`;return{registered:true}}

export async function payRideWithWallet(userId:string,rideId:string){
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rideId}))`;
    const ride=await tx.ride.findUnique({where:{id:rideId}});
    if(!ride)throw new Error("RIDE_NOT_FOUND");
    if(ride.riderId!==userId)throw new Error("FORBIDDEN");
    if(ride.status==="CANCELLED")throw new Error("RIDE_CANCELLED");
    const existing=await tx.payment.findUnique({where:{rideId}});
    if(existing){if(existing.provider==="WALLET"&&existing.status==="CAPTURED")return existing;throw new Error("PAYMENT_ALREADY_EXISTS");}
    const fare=await calculateFare(
      {latitude:Number(ride.pickupLatitude),longitude:Number(ride.pickupLongitude)},
      {latitude:Number(ride.dropoffLatitude),longitude:Number(ride.dropoffLongitude)},
      {destinations:Array.isArray(ride.routeStops)?ride.routeStops as any:[],serviceType:ride.serviceType as any}
    );
    const coins=Math.ceil(fare.totalFare);
    await tx.$executeRaw`INSERT INTO wallet_accounts(user_id) VALUES(${userId}::uuid) ON CONFLICT(user_id) DO NOTHING`;
    const wallet=await tx.$queryRaw<Array<{id:string;balance_coins:number}>>`SELECT id,balance_coins FROM wallet_accounts WHERE user_id=${userId}::uuid FOR UPDATE`;
    if((wallet[0]?.balance_coins??0)<coins)throw new Error("INSUFFICIENT_WALLET_COINS");
    const updated=await tx.$queryRaw<Array<{balance_coins:number}>>`UPDATE wallet_accounts SET balance_coins=balance_coins-${coins},updated_at=NOW() WHERE user_id=${userId}::uuid RETURNING balance_coins`;
    await tx.$executeRaw`INSERT INTO wallet_ledger(user_id,wallet_id,amount_coins,balance_after,type,reference_id,metadata) VALUES(${userId}::uuid,${wallet[0].id}::uuid,${-coins},${updated[0].balance_coins},'RIDE_PAYMENT',${rideId},${JSON.stringify({totalFare:fare.totalFare,coins})}::jsonb)`;
    return tx.payment.create({data:{rideId,payerId:userId,amount:fare.totalFare,currency:"INR",provider:"WALLET",status:"CAPTURED",paidAt:new Date(),metadata:{fare,walletCoins:coins}},include:{refunds:{orderBy:{createdAt:"desc"},take:10},ride:{select:{id:true,riderId:true,status:true}}}});
  });
}
