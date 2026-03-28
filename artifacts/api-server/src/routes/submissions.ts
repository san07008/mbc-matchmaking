import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router: IRouter = Router();

router.get("/cohorts/:cohortId/submissions", authMiddleware, async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const submissions = await db.select().from(submissionsTable).where(eq(submissionsTable.cohortId, cohortId));
    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cohorts/:cohortId/submissions", authMiddleware, async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const { name, availability } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const existing = await db.select().from(submissionsTable)
      .where(and(eq(submissionsTable.userId, req.user!.id), eq(submissionsTable.cohortId, cohortId)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(submissionsTable)
        .set({ name: name.trim(), availability, updatedAt: new Date() })
        .where(eq(submissionsTable.id, existing[0].id))
        .returning();
      res.json(updated);
    } else {
      const [submission] = await db.insert(submissionsTable).values({
        userId: req.user!.id,
        cohortId,
        name: name.trim(),
        email: req.user!.email,
        availability: availability || {},
      }).returning();
      res.json(submission);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
