import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { slotAssignmentsTable, submissionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";
import { sendEmail, buildAssignmentNotificationEmail, buildICSContent, isEmailConfigured } from "../lib/email";

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

router.post("/cohorts/:cohortId/notify-assignment", authMiddleware, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    const cohortId = parseInt(req.params.cohortId as string);
    const { preceptorName, day, time, startupName, zoomLink, cohortName, weekStartDate, timeIndex, dayIndex } = req.body;

    if (!preceptorName || !day || !time || !startupName || !cohortName) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!isEmailConfigured()) {
      res.status(400).json({ error: "Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables." });
      return;
    }

    const submissions = await db.select().from(submissionsTable)
      .where(and(eq(submissionsTable.cohortId, cohortId), eq(submissionsTable.name, preceptorName)));

    if (submissions.length === 0) {
      res.status(404).json({ error: "Could not find submission for this preceptor" });
      return;
    }

    const preceptorEmail = submissions[0].email;
    if (!preceptorEmail) {
      res.status(400).json({ error: "No email address found for this preceptor" });
      return;
    }

    const { subject, html } = buildAssignmentNotificationEmail({
      preceptorName,
      startupName,
      day,
      time,
      zoomLink,
      cohortName,
    });

    const attachments: Array<{ filename: string; content: string; contentType: string }> = [];

    if (weekStartDate && timeIndex !== undefined && dayIndex !== undefined && dayIndex >= 0) {
      {
        const [year, month, dayNum] = weekStartDate.split("-").map(Number);
        const startHour = timeIndex + 9;
        const startDate = new Date(Date.UTC(year, month - 1, dayNum + dayIndex, startHour, 0, 0));
        const endDate = new Date(Date.UTC(year, month - 1, dayNum + dayIndex, startHour + 1, 0, 0));

        const icsContent = buildICSContent({
          title: `MBC Meeting: ${preceptorName} & ${startupName}`,
          description: `Preceptor-Startup Matching Meeting\nStartup: ${startupName}${zoomLink ? `\nZoom: ${zoomLink}` : ""}`,
          startTime: startDate,
          endTime: endDate,
          location: zoomLink || "",
        });

        attachments.push({
          filename: "meeting.ics",
          content: icsContent,
          contentType: "text/calendar",
        });
      }
    }

    const result = await sendEmail(preceptorEmail, subject, html, attachments.length > 0 ? attachments : undefined);

    if (!result.success) {
      res.status(502).json({ error: result.error || "Failed to send email" });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
