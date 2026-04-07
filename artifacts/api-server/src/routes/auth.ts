import { Router, Request } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken } from "../middlewares/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { usersTable } from "@workspace/db";
import { botInstances, pendingQRCodes } from "../bot/manager.js";

const router = Router();
const SALT_ROUNDS = 12;

router.post("/auth/register", async (req, res, next) => {
  try {
    const { email, username, password } = req.body as { email: string; username: string; password: string };

    if (!email || !username || !password) {
      res.status(400).json({ error: "Email, username, and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json({ error: "Username must be 3-20 characters (letters, numbers, underscores)" });
      return;
    }

    const [existing] = await db
      .select()
      .from(accountsTable)
      .where(or(eq(accountsTable.email, email.toLowerCase()), eq(accountsTable.username, username.toLowerCase())));

    if (existing) {
      const field = existing.email === email.toLowerCase() ? "Email" : "Username";
      res.status(409).json({ error: `${field} is already taken` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    const [account] = await db.insert(accountsTable).values({
      id,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
    }).returning();

    const token = signToken({ accountId: account.id, email: account.email, username: account.username });

    res.status(201).json({
      token,
      account: { id: account.id, email: account.email, username: account.username, createdAt: account.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { login, password } = req.body as { login: string; password: string };

    if (!login || !password) {
      res.status(400).json({ error: "Email/username and password are required" });
      return;
    }

    const isEmail = login.includes("@");
    const [account] = await db
      .select()
      .from(accountsTable)
      .where(isEmail ? eq(accountsTable.email, login.toLowerCase()) : eq(accountsTable.username, login.toLowerCase()));

    if (!account) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({ accountId: account.id, email: account.email, username: account.username });

    res.json({
      token,
      account: { id: account.id, email: account.email, username: account.username, createdAt: account.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/me", requireAuth, async (req: Request & { accountId?: string }, res, next) => {
  try {
    const accountId = req.accountId!;
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    const bots = await db.select().from(usersTable).where(eq(usersTable.accountId, accountId));
    res.json({
      account: { id: account.id, email: account.email, username: account.username, createdAt: account.createdAt },
      bots: bots.map(b => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        status: b.status,
        linkedAt: b.linkedAt,
        lastSeen: b.lastSeen,
        isFirstConnection: b.isFirstConnection,
        connected: botInstances.get(b.id)?.connected === true,
        hasQR: pendingQRCodes.has(b.id),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
