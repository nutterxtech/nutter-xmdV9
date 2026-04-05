import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["active", "paused", "suspended"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  accountId: text("account_id"),
  name: text("name").notNull().default("My Bot"),
  phone: text("phone").unique(),
  sessionId: text("session_id"),
  status: userStatusEnum("status").notNull().default("active"),
  isFirstConnection: text("is_first_connection").notNull().default("true"),
  linkedAt: timestamp("linked_at"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
