import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { slotAssignmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";

const router: IRouter = Router();

router.get("/cohorts/:cohortId/slot-assignments", authMiddleware, async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const rows = await db.select().from(slotAssignmentsTable).where(eq(slotAssignmentsTable.cohortId, cohortId)).limit(1);
    if (rows.length === 0) {
      res.json({ selections: {}, assignments: {} });
    } else {
      res.json({ selections: rows[0].selections, assignments: rows[0].assignments });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/cohorts/:cohortId/slot-assignments", authMiddleware, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const { selections, assignments } = req.body;
    const existing = await db.select().from(slotAssignmentsTable).where(eq(slotAssignmentsTable.cohortId, cohortId)).limit(1);

    if (existing.length === 0) {
      await db.insert(slotAssignmentsTable).values({
        cohortId,
        selections: selections || {},
        assignments: assignments || {},
      });
    } else {
      await db.update(slotAssignmentsTable)
        .set({ selections: selections || {}, assignments: assignments || {}, updatedAt: new Date() })
        .where(eq(slotAssignmentsTable.cohortId, cohortId));
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
