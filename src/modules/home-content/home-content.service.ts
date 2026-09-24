import { prisma } from "../../core/prisma";

export type HomeBanner = {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  ctaLabel: string;
  ctaAction: string;
  isActive: boolean;
};

const DEFAULT_HOME_BANNER: HomeBanner = {
  title: "Ride. Explore. Experience.",
  subtitle: "Kurukshetra is waiting for you.",
  imageUrl: null,
  ctaLabel: "Explore",
  ctaAction: "BOOK_RIDE",
  isActive: true,
};

function parse(value: unknown): HomeBanner {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_HOME_BANNER;
  const v = value as Record<string, unknown>;
  return {
    title: typeof v.title === "string" && v.title.trim() ? v.title.trim() : DEFAULT_HOME_BANNER.title,
    subtitle: typeof v.subtitle === "string" ? v.subtitle : DEFAULT_HOME_BANNER.subtitle,
    imageUrl: typeof v.imageUrl === "string" && v.imageUrl.trim() ? v.imageUrl.trim() : null,
    ctaLabel: typeof v.ctaLabel === "string" && v.ctaLabel.trim() ? v.ctaLabel.trim() : DEFAULT_HOME_BANNER.ctaLabel,
    ctaAction: typeof v.ctaAction === "string" && v.ctaAction.trim() ? v.ctaAction.trim() : DEFAULT_HOME_BANNER.ctaAction,
    isActive: v.isActive !== false,
  };
}

export async function getHomeBanner(): Promise<HomeBanner | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: "HOME_BANNER" } });
  const banner = parse(row?.value);
  return banner.isActive ? banner : null;
}

export async function getAdminHomeBanner(): Promise<HomeBanner> {
  const row = await prisma.appSetting.findUnique({ where: { key: "HOME_BANNER" } });
  return parse(row?.value);
}

export async function updateHomeBanner(input: Partial<HomeBanner>): Promise<HomeBanner> {
  const current = await getAdminHomeBanner();
  if (input.imageUrl !== undefined && input.imageUrl !== null && !/^https:\/\//i.test(input.imageUrl)) {
    throw new Error("INVALID_HOME_BANNER_URL");
  }
  const next = parse({ ...current, ...input });
  const row = await prisma.appSetting.upsert({
    where: { key: "HOME_BANNER" },
    create: { key: "HOME_BANNER", value: next },
    update: { value: next },
  });
  return parse(row.value);
}
