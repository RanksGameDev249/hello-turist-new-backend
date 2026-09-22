import { Request, Response } from "express";

const settings: Record<string, string | number | boolean> = {
  maintenanceMode: false,
  supportEmail: "",
  defaultLanguage: "en",
};

export function getAdminSettings(_req: Request, res: Response) {
  return res.json({ settings });
}

export function updateAdminSettings(req: Request, res: Response) {
  const allowed = new Set(["maintenanceMode", "supportEmail", "defaultLanguage"]);
  const updates = req.body as Record<string, unknown>;
  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.has(key)) return res.status(400).json({ error: `Unsupported setting: ${key}` });
    if (key === "maintenanceMode" && typeof value !== "boolean") return res.status(400).json({ error: "maintenanceMode must be boolean" });
    if (key === "supportEmail" && typeof value !== "string") return res.status(400).json({ error: "supportEmail must be string" });
    if (key === "defaultLanguage" && (typeof value !== "string" || !["en", "hi"].includes(value))) return res.status(400).json({ error: "defaultLanguage must be en or hi" });
    settings[key] = value as never;
  }
  return res.json({ settings });
}
