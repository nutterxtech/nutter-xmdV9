import { WASocket } from "@whiskeysockets/baileys";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const presenceIntervals = new Map<string, NodeJS.Timeout>();

export function handlePresence(sock: WASocket, userId: string): void {
  const existing = presenceIntervals.get(userId);
  if (existing) clearInterval(existing);

  const interval = setInterval(async () => {
    const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    if (!settings) return;

    if (settings.alwaysonline) {
      await sock.sendPresenceUpdate("available").catch(() => {});
    }
  }, 30000);

  presenceIntervals.set(userId, interval);
  sock.sendPresenceUpdate("available").catch(() => {});
  logger.info({ userId }, "Presence handler started");
}

export function stopPresence(userId: string): void {
  const interval = presenceIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    presenceIntervals.delete(userId);
    logger.info({ userId }, "Presence handler stopped");
  }
}
