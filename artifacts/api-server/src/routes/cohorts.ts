import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cohortsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";

const router: IRouter = Router();

router.get("/cohorts", authMiddleware, async (_req, res) => {
  try {
    const cohorts = await db.select().from(cohortsTable);
    res.json(cohorts.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cohorts", authMiddleware, requireRole("superadmin"), async (req, res) => {
  try {
    const { name, timezone, weekStartDate } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [cohort] = await db.insert(cohortsTable).values({
      name: name.trim(),
      timezone: timezone || "America/New_York",
      weekStartDate: weekStartDate || null,
    }).returning();
    res.json(cohort);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/cohorts/:id", authMiddleware, requireRole("superadmin"), async (req, res) => {
  try {
    await db.delete(cohortsTable).where(eq(cohortsTable.id, parseInt(req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
