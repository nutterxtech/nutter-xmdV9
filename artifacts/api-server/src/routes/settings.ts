import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/settings/:userId", async (req, res) => {
  const { userId } = req.params;
  const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
  if (!settings) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }
  res.json(settings);
});

router.patch("/settings/:userId", async (req, res) => {
  const { userId } = req.params;
  const updates = req.body as Partial<typeof userSettingsTable.$inferSelect>;

  const allowed = [
    "prefix", "mode", "anticallMsg", "welcomeMsg", "goodbyeMsg", "likeEmojis",
    "anticall", "antilink", "antisticker", "antitag", "antibadword", "antispam",
    "antidelete", "chatbot", "autoread", "alwaysonline", "autoviewstatus",
    "autolikestatus", "autotype", "welcome", "goodbye",
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = (updates as any)[key];
  }

  if (Object.keys(filtered).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(userSettingsTable)
    .set(filtered)
    .where(eq(userSettingsTable.userId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }

  res.json(updated);
});

export default router;
