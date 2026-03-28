import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, sessionsTable, invitesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router: IRouter = Router();

const SUPER_ADMIN_EMAIL = process.env.VITE_SUPER_ADMIN_EMAIL;
if (!SUPER_ADMIN_EMAIL) {
  console.warn("WARNING: VITE_SUPER_ADMIN_EMAIL not set. Super admin self-registration disabled.");
}
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

async function createSession(userId: number, res: any) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  res.cookie("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  });
  return token;
}

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, inviteToken } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    let role = "preceptor";
    let cohortId: number | null = null;

    if (SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL) {
      role = "superadmin";
    } else if (inviteToken) {
      const invites = await db.select().from(invitesTable).where(eq(invitesTable.token, inviteToken)).limit(1);
      if (invites.length === 0) {
        res.status(400).json({ error: "Invalid invite link" });
        return;
      }
      if (invites[0].used) {
        res.status(400).json({ error: "This invite link has already been used" });
        return;
      }
      role = invites[0].role;
      cohortId = invites[0].cohortId;
      await db.update(invitesTable).set({ used: true, usedBy: email, usedAt: new Date() }).where(eq(invitesTable.token, inviteToken));
    } else {
      res.status(400).json({ error: "An invite link is required to create an account" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ email, passwordHash, role, displayName: "" }).returning();
    await createSession(user.id, res);
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role }, cohortId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (users.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, users[0].passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await createSession(users[0].id, res);
    res.json({ user: { id: users[0].id, email: users[0].email, displayName: users[0].displayName, role: users[0].role } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.session_token;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.clearCookie("session_token", { path: "/" });
  res.json({ ok: true });
});

export default router;
