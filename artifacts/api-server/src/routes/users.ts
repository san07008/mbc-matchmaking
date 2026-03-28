import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRole } from "../middleware/auth";

const router: IRouter = Router();

router.get("/users", authMiddleware, requireRole("superadmin"), async (_req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    }).from(usersTable);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/users/:id/role", authMiddleware, requireRole("superadmin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["preceptor", "admin", "superadmin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    await db.update(usersTable).set({ role }).where(eq(usersTable.id, parseInt(req.params.id as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
