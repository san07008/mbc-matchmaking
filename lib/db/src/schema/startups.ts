import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cohortsTable } from "./cohorts";

export const startupsTable = pgTable("startups", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohort_id").notNull().references(() => cohortsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  industry: text("industry").notNull().default(""),
  stage: text("stage").notNull().default(""),
  description: text("description").notNull().default(""),
  founders: text("founders").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStartupSchema = createInsertSchema(startupsTable).omit({ id: true, createdAt: true });
export type InsertStartup = z.infer<typeof insertStartupSchema>;
export type Startup = typeof startupsTable.$inferSelect;
