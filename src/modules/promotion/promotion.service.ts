import { prisma } from "../../core/prisma";
import type { CreatePromotionInput, UpdatePromotionInput } from "./promotion.schema";

export async function listActivePromotions() {
  return prisma.$queryRawUnsafe(`SELECT * FROM promotions WHERE is_active = true AND starts_at <= NOW() AND expires_at > NOW() AND (usage_limit IS NULL OR used_count < usage_limit) ORDER BY created_at DESC`);
}

export async function getPromotionByCode(code: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM promotions WHERE code = $1 AND is_active = true AND starts_at <= NOW() AND expires_at > NOW() AND (usage_limit IS NULL OR used_count < usage_limit)`, code.toUpperCase());
  if (!rows[0]) throw new Error("PROMOTION_NOT_FOUND");
  return rows[0];
}

export async function createPromotion(input: CreatePromotionInput) {
  return prisma.$queryRawUnsafe<any[]>(`INSERT INTO promotions (code,title,description,discount_type,discount_value,max_discount,min_ride_amount,usage_limit,starts_at,expires_at,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, input.code,input.title,input.description ?? null,input.discountType,input.discountValue,input.maxDiscount ?? null,input.minRideAmount ?? null,input.usageLimit ?? null,input.startsAt,input.expiresAt,input.isActive).then(r => r[0]);
}

export async function updatePromotion(id: string, input: UpdatePromotionInput) {
  const entries = Object.entries(input).filter(([,v]) => v !== undefined);
  if (!entries.length) return getPromotionById(id);
  const map: Record<string,string> = { title:"title",description:"description",discountType:"discount_type",discountValue:"discount_value",maxDiscount:"max_discount",minRideAmount:"min_ride_amount",usageLimit:"usage_limit",startsAt:"starts_at",expiresAt:"expires_at",isActive:"is_active" };
  const sets = entries.map(([k],i) => `"${map[k]}" = $${i+2}`).join(", ");
  const values = entries.map(([,v]) => v);
  const rows = await prisma.$queryRawUnsafe<any[]>(`UPDATE promotions SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`, id, ...values);
  if (!rows[0]) throw new Error("PROMOTION_NOT_FOUND"); return rows[0];
}

export async function getPromotionById(id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM promotions WHERE id = $1`, id);
  if (!rows[0]) throw new Error("PROMOTION_NOT_FOUND"); return rows[0];
}

export async function deletePromotion(id: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`UPDATE promotions SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`, id);
  if (!rows[0]) throw new Error("PROMOTION_NOT_FOUND"); return rows[0];
}
