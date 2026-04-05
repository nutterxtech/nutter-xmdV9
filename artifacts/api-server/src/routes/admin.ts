import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { botInstances, pauseBotInstance, disconnectBotInstance } from "../bot/manager.js";
import { stopPresence } from "../bot/presence.js";

const router = Router();

function getAdminCredentials(): { username: string; key: string } | null {
  const username = process.env.ADMIN_USERNAME;
  const key = process.env.ADMIN_KEY;
  if (!username || !key) return null;
  return { username, key };
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const creds = getAdminCredentials();
  if (!creds) {
    res.status(500).json({ error: "Server misconfigured: ADMIN_USERNAME or ADMIN_KEY not set" });
    return;
  }

  const token = req.headers["x-admin-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64").toString();
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const colonIdx = decoded.indexOf(":");
  if (colonIdx < 0) {
    res.status(401).json({ error: "Invalid token format" });
    return;
  }

  const user = decoded.slice(0, colonIdx);
  const key = decoded.slice(colonIdx + 1);

  if (user !== creds.username || key !== creds.key) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  next();
}

router.post("/admin/login", (req, res) => {
  const creds = getAdminCredentials();
  if (!creds) {
    res.status(500).json({ error: "Server misconfigured: ADMIN_KEY not set" });
    return;
  }

  const { username, adminKey } = req.body as { username: string; adminKey: string };

  if (username !== creds.username || adminKey !== creds.key) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = Buffer.from(`${username}:${adminKey}`).toString("base64");
  res.json({ token, username });
});

router.get("/admin/users", requireAdmin, async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    phone: usersTable.phone,
    status: usersTable.status,
    sessionId: usersTable.sessionId,
    linkedAt: usersTable.linkedAt,
    lastSeen: usersTable.lastSeen,
    isFirstConnection: usersTable.isFirstConnection,
  }).from(usersTable);

  const result = users.map(u => ({
    ...u,
    connected: botInstances.has(u.id),
  }));

  res.json(result);
});

router.get("/admin/users/:id/settings", requireAdmin, async (req: Request<{ id: string }>, res) => {
  const id = req.params.id;
  const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, id));
  if (!settings) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(settings);
});

router.get("/admin/users/:id/session", requireAdmin, async (req: Request<{ id: string }>, res) => {
  const id = req.params.id;
  const [user] = await db.select({
    sessionId: usersTable.sessionId,
    phone: usersTable.phone,
    status: usersTable.status,
    isFirstConnection: usersTable.isFirstConnection,
    lastSeen: usersTable.lastSeen,
    linkedAt: usersTable.linkedAt,
  }).from(usersTable).where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const connected = botInstances.has(id);
  res.json({ ...user, connected });
});

router.post("/admin/users/:id/disconnect", requireAdmin, async (req: Request<{ id: string }>, res) => {
  const id = req.params.id;
  await disconnectBotInstance(id);
  stopPresence(id);
  await db.update(usersTable).set({ status: "paused", lastSeen: new Date() }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Bot disconnected and logged out" });
});

router.post("/admin/users/:id/pause", requireAdmin, async (req: Request<{ id: string }>, res) => {
  const id = req.params.id;
  await db.update(usersTable).set({ status: "paused" }).where(eq(usersTable.id, id));
  await pauseBotInstance(id);
  stopPresence(id);
  res.json({ success: true, message: "Bot paused" });
});

router.post("/admin/users/:id/suspend", requireAdmin, async (req: Request<{ id: string }>, res) => {
  const id = req.params.id;
  await db.update(usersTable).set({ status: "suspended" }).where(eq(usersTable.id, id));
  await disconnectBotInstance(id);
  stopPresence(id);
  res.json({ success: true, message: "User suspended" });
});

router.delete("/admin/users/:id", requireAdmin, async (req: Request<{ id: string }>, res) => {
  const id = req.params.id;
  await disconnectBotInstance(id);
  stopPresence(id);
  await db.delete(userSettingsTable).where(eq(userSettingsTable.userId, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true, message: "User deleted" });
});

export default router;
