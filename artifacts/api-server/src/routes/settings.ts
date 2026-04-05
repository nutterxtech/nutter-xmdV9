import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";

const router = Router();

async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.params.userId;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const userToken = req.headers["x-user-token"] as string | undefined;
  const adminToken = req.headers["x-admin-token"] as string | undefined;

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "nutterx";
  const ADMIN_KEY = process.env.ADMIN_KEY;

  if (adminToken && ADMIN_KEY) {
    const decoded = Buffer.from(adminToken, "base64").toString();
    const [user, key] = decoded.split(":");
    if (user === ADMIN_USERNAME && key === ADMIN_KEY) {
      next();
      return;
    }
  }

  if (userToken) {
    const decoded = Buffer.from(userToken, "base64").toString();
    const [uid, sessionId] = decoded.split(":");
    if (uid === userId) {
      const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
      if (dbUser?.sessionId === sessionId) {
        next();
        return;
      }
    }
  }

  res.status(401).json({ error: "Unauthorized" });
}

router.get("/settings/:userId", requireUser, async (req, res) => {
  const { userId } = req.params;
  const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
  if (!settings) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }
  res.json(settings);
});

router.patch("/settings/:userId", requireUser, async (req, res) => {
  const { userId } = req.params;
  const updates = req.body as Record<string, unknown>;

  const allowed = [
    "prefix", "mode", "anticallMsg", "welcomeMsg", "goodbyeMsg", "likeEmojis",
    "anticall", "antilink", "antisticker", "antitag", "antibadword", "antispam",
    "antidelete", "chatbot", "autoread", "alwaysonline", "autoviewstatus",
    "autolikestatus", "autotype", "welcome", "goodbye",
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
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
