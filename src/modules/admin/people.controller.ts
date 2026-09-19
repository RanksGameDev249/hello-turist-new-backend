import type { Request, Response } from "express";
import { getPerson, listPeople, type PeopleRole } from "./people.service";

const ROLES = new Set(["RIDER", "DRIVER", "GUIDE"]);

export async function getPeople(req: Request, res: Response) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const role = typeof req.query.role === "string" && ROLES.has(req.query.role) ? req.query.role as PeopleRole : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const result = await listPeople({ page, limit, role, status, search });
  return res.json({ success: true, data: { items: result.items, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) } } });
}

export async function getPersonById(req: Request, res: Response) {
  const id = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!id) return res.status(400).json({ success: false, message: "Invalid person id" });
  const person = await getPerson(id);
  if (!person) return res.status(404).json({ success: false, message: "Person not found" });
  return res.json({ success: true, data: person });
}
