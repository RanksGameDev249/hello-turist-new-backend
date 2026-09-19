import { prisma } from "../../core/prisma";

export type BrandingUpdate = { appName?: string; logoUrl?: string; iconUrl?: string };

export async function getBranding() {
  const row = await prisma.appSetting.findUnique({ where: { key: "APP_BRANDING" } });
  return row?.value ?? { appName: "Hello Tourist", logoUrl: null, iconUrl: null };
}

export async function updateBranding(input: BrandingUpdate) {
  if (input.appName !== undefined && (input.appName.trim().length < 2 || input.appName.trim().length > 60)) throw new Error("INVALID_APP_NAME");
  for (const key of ["logoUrl", "iconUrl"] as const) if (input[key] !== undefined && input[key] !== null && !/^https:\/\//i.test(input[key]!)) throw new Error("INVALID_BRANDING_URL");
  const current = await getBranding();
  const value = { ...current, ...input, appName: input.appName?.trim() ?? current.appName };
  const row = await prisma.appSetting.upsert({ where: { key: "APP_BRANDING" }, create: { key: "APP_BRANDING", value }, update: { value } });
  return row.value;
}
