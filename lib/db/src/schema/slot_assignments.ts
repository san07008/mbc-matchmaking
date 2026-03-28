import { pgTable, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cohortsTable } from "./cohorts";

export const slotAssignmentsTable = pgTable("slot_assignments", {
  id: serial("id").primaryKey(),
  cohortId: integer("cohort_id").notNull().unique().references(() => cohortsTable.id, { onDelete: "cascade" }),
  selections: jsonb("selections").notNull().default({}),
  assignments: jsonb("assignments").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSlotAssignmentSchema = createInsertSchema(slotAssignmentsTable).omit({ id: true, updatedAt: true });
export type InsertSlotAssignment = z.infer<typeof insertSlotAssignmentSchema>;
export type SlotAssignment = typeof slotAssignmentsTable.$inferSelect;
