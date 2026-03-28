import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cohortsTable = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  weekStartDate: text("week_start_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCohortSchema = createInsertSchema(cohortsTable).omit({ id: true, createdAt: true });
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Cohort = typeof cohortsTable.$inferSelect;
