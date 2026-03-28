import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { startupsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";

const router: IRouter = Router();

router.get("/cohorts/:cohortId/startups", authMiddleware, async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const startups = await db.select().from(startupsTable).where(eq(startupsTable.cohortId, cohortId));
    res.json(startups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cohorts/:cohortId/startups", authMiddleware, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const { name, industry, stage, description, founders } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [startup] = await db.insert(startupsTable).values({
      cohortId,
      name: name.trim(),
      industry: industry || "",
      stage: stage || "",
      description: description || "",
      founders: founders || "",
    }).returning();
    res.json(startup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/cohorts/:cohortId/startups/:id", authMiddleware, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    const { name, industry, stage, description, founders } = req.body;
    const [updated] = await db.update(startupsTable)
      .set({ name, industry, stage, description, founders })
      .where(eq(startupsTable.id, parseInt(req.params.id as string)))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/cohorts/:cohortId/startups/:id", authMiddleware, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    await db.delete(startupsTable).where(eq(startupsTable.id, parseInt(req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
