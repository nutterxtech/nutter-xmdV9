import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { botInstances } from "../bot/manager.js";
import { stopPresence } from "../bot/presence.js";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "nutterx";
const ADMIN_KEY = process.env.ADMIN_KEY || "nutter-admin-2024";

function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers["x-admin-token"];
  const token = authHeader as string;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user, key] = Buffer.from(token, "base64").toString().split(":");
  if (user !== ADMIN_USERNAME || key !== ADMIN_KEY) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  next();
}

router.post("/admin/login", (req, res) => {
  const { username, adminKey } = req.body as { username: string; adminKey: string };

  if (username !== ADMIN_USERNAME || adminKey !== ADMIN_KEY) {
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

router.get("/admin/users/:id/settings", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, id));
  if (!settings) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(settings);
});

router.get("/admin/users/:id/session", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [user] = await db.select({ sessionId: usersTable.sessionId, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ sessionId: user.sessionId, phone: user.phone });
});

router.post("/admin/users/:id/disconnect", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const instance = botInstances.get(id);
  if (instance) {
    await instance.socket.logout().catch(() => {});
    botInstances.delete(id);
    stopPresence(id);
  }
  await db.update(usersTable).set({ status: "paused", lastSeen: new Date() }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Bot disconnected" });
});

router.post("/admin/users/:id/pause", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.update(usersTable).set({ status: "paused" }).where(eq(usersTable.id, id));
  const instance = botInstances.get(id);
  if (instance) {
    await instance.socket.end(undefined).catch(() => {});
    botInstances.delete(id);
    stopPresence(id);
  }
  res.json({ success: true, message: "Bot paused" });
});

router.post("/admin/users/:id/suspend", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.update(usersTable).set({ status: "suspended" }).where(eq(usersTable.id, id));
  const instance = botInstances.get(id);
  if (instance) {
    await instance.socket.logout().catch(() => {});
    botInstances.delete(id);
    stopPresence(id);
  }
  res.json({ success: true, message: "User suspended" });
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const instance = botInstances.get(id);
  if (instance) {
    await instance.socket.logout().catch(() => {});
    botInstances.delete(id);
    stopPresence(id);
  }
  await db.delete(userSettingsTable).where(eq(userSettingsTable.userId, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true, message: "User deleted" });
});

export default router;
