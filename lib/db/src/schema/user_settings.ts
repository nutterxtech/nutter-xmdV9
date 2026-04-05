import { pgTable, text, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSettingsTable = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  prefix: text("prefix").notNull().default("."),
  mode: text("mode").notNull().default("private"),
  anticallMsg: text("anticall_msg").default("📵 Calls are not allowed. Please send a message instead."),
  welcomeMsg: text("welcome_msg").default("👋 Welcome {user} to {group}! We're glad to have you here. 🎉"),
  goodbyeMsg: text("goodbye_msg").default("👋 Goodbye {user}! We hope to see you again. 💫"),
  likeEmojis: text("like_emojis").notNull().default("🎉 ✨ 💯 🩵 🔥"),
  anticall: boolean("anticall").notNull().default(false),
  antilink: boolean("antilink").notNull().default(false),
  antisticker: boolean("antisticker").notNull().default(false),
  antitag: boolean("antitag").notNull().default(false),
  antibadword: boolean("antibadword").notNull().default(false),
  antispam: boolean("antispam").notNull().default(false),
  antidelete: boolean("antidelete").notNull().default(false),
  chatbot: boolean("chatbot").notNull().default(false),
  autoread: boolean("autoread").notNull().default(true),
  alwaysonline: boolean("alwaysonline").notNull().default(true),
  autoviewstatus: boolean("autoviewstatus").notNull().default(true),
  autolikestatus: boolean("autolikestatus").notNull().default(true),
  autotype: boolean("autotype").notNull().default(false),
  welcome: boolean("welcome").notNull().default(true),
  goodbye: boolean("goodbye").notNull().default(true),
  badwords: jsonb("badwords").$type<string[]>().default([]),
});

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable);
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
