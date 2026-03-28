import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { invitesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";
import { sendEmail, buildInviteEmail, isEmailConfigured } from "../lib/email";

const router: IRouter = Router();

router.get("/invites/email-status", authMiddleware, requireRole("superadmin", "admin"), (_req, res) => {
  res.json({ configured: isEmailConfigured() });
});

router.get("/invites", authMiddleware, requireRole("superadmin"), async (_req, res) => {
  try {
    const invites = await db.select().from(invitesTable);
    invites.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    res.json(invites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/invites/validate/:token", async (req, res) => {
  try {
    const invites = await db.select().from(invitesTable).where(eq(invitesTable.token, req.params.token as string)).limit(1);
    if (invites.length === 0) {
      res.json({ valid: false, reason: "not_found" });
      return;
    }
    const invite = invites[0];
    if (invite.used) {
      res.json({ valid: false, reason: "already_used", role: invite.role, cohortName: invite.cohortName });
      return;
    }
    res.json({ valid: true, role: invite.role, cohortName: invite.cohortName, cohortId: invite.cohortId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/invites", authMiddleware, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    const { role, cohortId, cohortName, recipientEmail, baseUrl } = req.body;
    if (!role || !["admin", "preceptor"].includes(role)) {
      res.status(400).json({ error: "Valid role is required" });
      return;
    }
    if (role === "admin" && req.user!.role !== "superadmin") {
      res.status(403).json({ error: "Only super admins can create admin invites" });
      return;
    }
    const token = crypto.randomBytes(24).toString("hex");
    const [invite] = await db.insert(invitesTable).values({
      token,
      role,
      cohortId: cohortId || null,
      cohortName: cohortName || null,
      used: false,
      createdBy: req.user!.email,
    }).returning();

    let emailSent = false;
    let emailError: string | undefined;

    if (recipientEmail && baseUrl && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      const inviteLink = `${baseUrl}?invite=${token}`;
      const { subject, html } = buildInviteEmail({
        recipientEmail,
        role,
        cohortName,
        inviteLink,
      });
      const result = await sendEmail(recipientEmail, subject, html);
      emailSent = result.success;
      emailError = result.error;
    }

    res.json({ ...invite, emailSent, emailError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/invites/:id", authMiddleware, requireRole("superadmin"), async (req, res) => {
  try {
    await db.delete(invitesTable).where(eq(invitesTable.id, parseInt(req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
