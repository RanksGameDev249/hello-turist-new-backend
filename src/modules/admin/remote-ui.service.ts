import { prisma } from "../../core/prisma";

const SCREENS = ["RIDER_HOME","RIDER_TRIPS","RIDER_WALLET","RIDER_PROFILE","RIDE_DETAIL","DRIVER_HOME","DRIVER_RIDES","DRIVER_PROFILE","GUIDE_HOME","GUIDE_RIDES","GUIDE_PROFILE"] as const;
const COMPONENTS = new Set(["text","image","banner","card","list","grid","button","quick_actions","spacer","divider"]);
const ACTIONS = new Set(["NONE","OPEN_RIDE","OPEN_WALLET","OPEN_PROFILE","OPEN_TRIPS","OPEN_SOS","OPEN_NOTIFICATIONS","OPEN_SUPPORT","BOOK_RIDE"]);

function validate(schema: any) {
  if (!schema || typeof schema !== "object" || !SCREENS.includes(schema.screen)) throw new Error("INVALID_SCREEN_SCHEMA");
  if (!Array.isArray(schema.sections) || schema.sections.length > 100) throw new Error("INVALID_SCREEN_SECTIONS");
  for (const section of schema.sections) {
    if (!section || typeof section !== "object" || !COMPONENTS.has(section.type)) throw new Error("INVALID_COMPONENT");
    if (section.action && !ACTIONS.has(section.action)) throw new Error("INVALID_ACTION");
    if (section.visible !== undefined && typeof section.visible !== "boolean") throw new Error("INVALID_VISIBILITY");
  }
}

export async function getPublishedScreen(screen: string, role?: string) {
  const where: any = { screen, status: "PUBLISHED" };
  if (role) where.role = role;
  const rows = await prisma.appSetting.findMany({ where: { key: { startsWith: `REMOTE_UI:${screen}:` } }, orderBy: { updatedAt: "desc" }, take: 20 });
  const match = rows.find((r: any) => !role || String(r.key).includes(`:${role}:`));
  return match?.value ?? null;
}

export async function saveScreenDraft(screen: string, role: string, schema: any, adminId: string) {
  validate(schema);
  const key = `REMOTE_UI:${screen}:${role}:DRAFT`;
  return prisma.appSetting.upsert({ where: { key }, create: { key, value: { ...schema, screen, role, status: "DRAFT", updatedBy: adminId } }, update: { value: { ...schema, screen, role, status: "DRAFT", updatedBy: adminId } } });
}

export async function publishScreen(screen: string, role: string, adminId: string) {
  const draft = await prisma.appSetting.findUnique({ where: { key: `REMOTE_UI:${screen}:${role}:DRAFT` } });
  if (!draft) throw new Error("DRAFT_NOT_FOUND");
  validate(draft.value);
  const current = await prisma.appSetting.findUnique({ where: { key: `REMOTE_UI:${screen}:${role}:PUBLISHED` } });
  const version = Number((current?.value as any)?.version ?? 0) + 1;
  return prisma.$transaction(async tx => {
    await tx.appSetting.upsert({ where: { key: `REMOTE_UI:${screen}:${role}:PUBLISHED` }, create: { key: `REMOTE_UI:${screen}:${role}:PUBLISHED`, value: { ...(draft.value as any), status: "PUBLISHED", version, publishedBy: adminId, publishedAt: new Date().toISOString() } }, update: { value: { ...(draft.value as any), status: "PUBLISHED", version, publishedBy: adminId, publishedAt: new Date().toISOString() } } });
    return { screen, role, version };
  });
}
