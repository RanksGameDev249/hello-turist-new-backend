import { prisma } from "../../core/prisma";

export type BrandingUpdate = {
  appName?: string;
  logoUrl?: string | null;
  iconUrl?: string | null;
};

export type AppBranding = {
  appName: string;
  logoUrl: string | null;
  iconUrl: string | null;
};

const DEFAULT_BRANDING: AppBranding = {
  appName: "Hello Tourist",
  logoUrl: null,
  iconUrl: null,
};

function parseBranding(value: unknown): AppBranding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_BRANDING;
  }

  const source = value as Record<string, unknown>;

  return {
    appName: typeof source.appName === "string" && source.appName.trim().length > 0
      ? source.appName
      : DEFAULT_BRANDING.appName,
    logoUrl: typeof source.logoUrl === "string" ? source.logoUrl : null,
    iconUrl: typeof source.iconUrl === "string" ? source.iconUrl : null,
  };
}

export async function getBranding(): Promise<AppBranding> {
  const row = await prisma.appSetting.findUnique({ where: { key: "APP_BRANDING" } });
  return parseBranding(row?.value);
}

export async function updateBranding(input: BrandingUpdate): Promise<AppBranding> {
  if (
    input.appName !== undefined &&
    (input.appName.trim().length < 2 || input.appName.trim().length > 60)
  ) {
    throw new Error("INVALID_APP_NAME");
  }

  for (const key of ["logoUrl", "iconUrl"] as const) {
    if (
      input[key] !== undefined &&
      input[key] !== null &&
      !/^https:\/\//i.test(input[key]!)
    ) {
      throw new Error("INVALID_BRANDING_URL");
    }
  }

  const current = await getBranding();
  const value: AppBranding = {
    appName: input.appName?.trim() ?? current.appName,
    logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
    iconUrl: input.iconUrl !== undefined ? input.iconUrl : current.iconUrl,
  };

  const row = await prisma.appSetting.upsert({
    where: { key: "APP_BRANDING" },
    create: { key: "APP_BRANDING", value },
    update: { value },
  });

  return parseBranding(row.value);
}
