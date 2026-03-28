import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db/schema";
import { eq, gt } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        displayName: string;
        role: string;
      };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (sessions.length === 0 || sessions[0].expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, sessions[0].userId))
    .limit(1);

  if (users.length === 0) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = {
    id: users[0].id,
    email: users[0].email,
    displayName: users[0].displayName,
    role: users[0].role,
  };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
