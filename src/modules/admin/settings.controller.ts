import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

const defaults: Record<string, string | boolean> = {
  maintenanceMode: false,
  supportEmail: "",
  defaultLanguage: "en",
};

function validate(key: string, value: unknown): string | null {
  if (key === "maintenanceMode" && typeof value !== "boolean") return "maintenanceMode must be boolean";
  if (key === "supportEmail" && typeof value !== "string") return "supportEmail must be string";
  if (key === "defaultLanguage" && (typeof value !== "string" || !["en", "hi"].includes(value))) return "defaultLanguage must be en or hi";
  return null;
}

export async function getAdminSettings(_req: Request, res: Response) {
  const rows = await prisma.appSetting.findMany();
  const settings: Record<string, unknown> = { ...defaults };
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return res.json({ settings });
}

export async function updateAdminSettings(req: Request, res: Response) {
  const allowed = new Set(Object.keys(defaults));
  const updates = req.body as Record<string, unknown>;
  const entries = Object.entries(updates);
  if (!entries.length) return res.status(400).json({ error: "At least one setting is required" });
  for (const [key, value] of entries) {
    if (!allowed.has(key)) return res.status(400).json({ error: `Unsupported setting: ${key}` });
    const error = validate(key, value);
    if (error) return res.status(400).json({ error });
  }
  await prisma.$transaction(entries.map(([key, value]) => prisma.appSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  })));
  return getAdminSettings(req, res);
}
