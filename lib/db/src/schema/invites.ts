import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invitesTable = pgTable("invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default("preceptor"),
  cohortId: integer("cohort_id"),
  cohortName: text("cohort_name"),
  used: boolean("used").notNull().default(false),
  usedBy: text("used_by"),
  usedAt: timestamp("used_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInviteSchema = createInsertSchema(invitesTable).omit({ id: true, createdAt: true, usedAt: true });
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invitesTable.$inferSelect;
