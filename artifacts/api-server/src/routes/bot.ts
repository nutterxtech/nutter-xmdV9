import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { initiatePairing, botInstances } from "../bot/manager.js";

const router = Router();

router.post("/bot/pair", async (req, res) => {
  const { phone } = req.body as { phone: string };
  if (!phone) {
    res.status(400).json({ error: "Phone number required" });
    return;
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 7) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.phone, cleanPhone));

  if (!user) {
    const userId = uuidv4();
    const sessionId = uuidv4();
    [user] = await db.insert(usersTable).values({
      id: userId,
      phone: cleanPhone,
      sessionId,
      status: "active",
      isFirstConnection: "true",
    }).returning();

    await db.insert(userSettingsTable).values({ userId }).onConflictDoNothing();
  }

  if (user.status === "suspended") {
    res.status(403).json({ error: "Account suspended" });
    return;
  }
  if (user.status === "paused") {
    await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, user.id));
  }

  const existing = botInstances.get(user.id);
  if (existing) {
    const userToken = Buffer.from(`${user.id}:${user.sessionId}`).toString("base64");
    res.json({ pairingCode: null, userId: user.id, userToken, message: "Bot already connected" });
    return;
  }

  try {
    const code = await initiatePairing(user.id, cleanPhone);
    await db.update(usersTable).set({ linkedAt: new Date() }).where(eq(usersTable.id, user.id));
    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
    const userToken = Buffer.from(`${user.id}:${updatedUser?.sessionId || user.sessionId}`).toString("base64");
    res.json({ pairingCode: code, userId: user.id, userToken });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate pairing code";
    res.status(500).json({ error: message });
  }
});

router.get("/bot/status/:userId", async (req, res) => {
  const { userId } = req.params;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const instance = botInstances.get(userId);
  res.json({
    userId: user.id,
    phone: user.phone,
    connected: !!instance,
    status: user.status,
    lastSeen: user.lastSeen,
  });
});

router.get("/bot/status-by-phone/:phone", async (req, res) => {
  const cleanPhone = req.params.phone.replace(/[^0-9]/g, "");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, cleanPhone));
  if (!user) {
    res.json({ connected: false, status: "not_registered" });
    return;
  }
  const instance = botInstances.get(user.id);
  res.json({
    userId: user.id,
    phone: user.phone,
    connected: !!instance,
    status: user.status,
    lastSeen: user.lastSeen,
  });
});

export default router;
