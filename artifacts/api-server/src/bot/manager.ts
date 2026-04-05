import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  WASocket,
  BaileysEventMap,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { messagesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { handleCommand } from "./commands/index.js";
import { handleProtection } from "./protection.js";
import { handlePresence } from "./presence.js";

const AUTH_DIR = join(process.cwd(), "sessions");

export interface BotInstance {
  socket: WASocket;
  userId: string;
  phone: string;
  isFirstConnection: boolean;
}

export const botInstances = new Map<string, BotInstance>();
export const pendingPairings = new Map<string, {
  resolve: (code: string) => void;
  reject: (err: Error) => void;
}>();

function getAuthDir(userId: string) {
  const dir = join(AUTH_DIR, userId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export async function createBotInstance(
  userId: string,
  phone: string,
  isFirstConnection: boolean,
  silentStart = false
): Promise<void> {
  const authDir = getAuthDir(userId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    printQRInTerminal: false,
    logger: logger as any,
    browser: ["NUTTER-XMD", "Chrome", "4.0.0"],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  const instance: BotInstance = { socket: sock, userId, phone, isFirstConnection };
  botInstances.set(userId, instance);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr, pairingCode } = update;

    if (pairingCode) {
      logger.info({ userId, pairingCode }, "Pairing code generated");
      const pending = pendingPairings.get(userId);
      if (pending) {
        pending.resolve(pairingCode);
        pendingPairings.delete(userId);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        logger.info({ userId }, "Reconnecting bot...");
        setTimeout(() => createBotInstance(userId, phone, false, true), 5000);
      } else {
        logger.info({ userId }, "Bot logged out");
        botInstances.delete(userId);
        await db.update(usersTable)
          .set({ status: "paused", lastSeen: new Date() })
          .where(eq(usersTable.id, userId));
      }
    }

    if (connection === "open") {
      logger.info({ userId }, "Bot connected!");

      await db.update(usersTable)
        .set({ status: "active", lastSeen: new Date(), isFirstConnection: "false" })
        .where(eq(usersTable.id, userId));

      if (instance.isFirstConnection && !silentStart) {
        try {
          const jid = `${phone}@s.whatsapp.net`;
          await sock.sendMessage(jid, {
            text: `✅ *NUTTER-XMD V.9.1.3* connected successfully!\n\nType *.menu* to get started ⚡\n\n_Powered by *NUTTER-XMD* ⚡_`,
          });
          logger.info({ userId }, "Startup message sent");
        } catch (err) {
          logger.error({ err, userId }, "Failed to send startup message");
        }
      }

      instance.isFirstConnection = false;

      handlePresence(sock, userId);

      const autoJoinGroup = process.env.NUTTER_AUTO_JOIN_GROUP;
      const autoJoinChannel = process.env.NUTTER_AUTO_JOIN_CHANNEL;

      if (autoJoinGroup && !silentStart) {
        try {
          await sock.groupAcceptInvite(autoJoinGroup);
        } catch (_) {}
      }
      if (autoJoinChannel && !silentStart) {
        try {
          await sock.newsletterFollow(autoJoinChannel);
        } catch (_) {}
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message) continue;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!user || user.status !== "active") continue;

      const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
      if (!settings) continue;

      if (settings.autoread) {
        try {
          await sock.readMessages([msg.key]);
        } catch (_) {}
      }

      const msgId = uuidv4();
      const chatId = msg.key.remoteJid || "";
      try {
        await db.insert(messagesTable).values({
          id: msgId,
          userId,
          chatId,
          messageId: msg.key.id || "",
          content: msg as any,
        });
      } catch (_) {}

      await handleProtection(sock, msg, settings, userId);
      await handleCommand(sock, msg, settings, userId);
    }
  });

  sock.ev.on("messages.delete", async (item) => {
    const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    if (!settings?.antidelete) return;

    const keys = "keys" in item ? item.keys : [];
    for (const key of keys) {
      if (!key.remoteJid || !key.id) continue;
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const [cached] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.messageId, key.id));

      if (!cached || new Date(cached.createdAt) < tenMinutesAgo) continue;

      const originalMsg = cached.content as proto.IWebMessageInfo;
      if (!originalMsg?.message) continue;

      const senderJid = key.participant || key.remoteJid;
      const chatJid = key.remoteJid;

      try {
        await sock.sendMessage(chatJid, {
          text: `🔄 *Anti-Delete*\n\n*From:* @${senderJid.split("@")[0]}\n*Deleted message recovered:*`,
          mentions: [senderJid],
        });
        await sock.sendMessage(chatJid, originalMsg.message as any);
      } catch (_) {}
    }
  });

  sock.ev.on("call", async (calls) => {
    const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    if (!settings?.anticall) return;

    for (const call of calls) {
      if (call.status === "offer") {
        try {
          await sock.rejectCall(call.id, call.from);
          const msg = settings.anticallMsg || "📵 Calls are not allowed.";
          await sock.sendMessage(call.from, { text: msg });
        } catch (_) {}
      }
    }
  });

  sock.ev.on("groups.update", async (updates) => {
    for (const update of updates) {
      logger.info({ update }, "Group updated");
    }
  });

  sock.ev.on("group-participants.update", async ({ id: groupJid, participants, action }) => {
    const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    if (!settings) return;

    const groupMeta = await sock.groupMetadata(groupJid).catch(() => null);
    if (!groupMeta) return;

    const botJid = sock.user?.id || "";
    const botParticipant = groupMeta.participants.find(p => p.id === botJid);
    const isBotAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";

    if (!isBotAdmin) return;

    for (const participant of participants) {
      const name = participant.split("@")[0];
      const groupName = groupMeta.subject;

      if (action === "add" && settings.welcome) {
        const msg = (settings.welcomeMsg || "👋 Welcome {user} to {group}!")
          .replace("{user}", `@${name}`)
          .replace("{group}", groupName);
        await sock.sendMessage(groupJid, { text: msg, mentions: [participant] }).catch(() => {});
      }
      if (action === "remove" && settings.goodbye) {
        const msg = (settings.goodbyeMsg || "👋 Goodbye {user}!")
          .replace("{user}", `@${name}`)
          .replace("{group}", groupName);
        await sock.sendMessage(groupJid, { text: msg, mentions: [participant] }).catch(() => {});
      }
    }
  });

  sock.ev.on("status.update" as any, async (statuses: any[]) => {
    const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    if (!settings) return;

    for (const status of statuses) {
      if (settings.autoviewstatus) {
        try {
          await sock.readMessages([{ remoteJid: "status@broadcast", id: status.id, participant: status.from }]);
        } catch (_) {}
      }
      if (settings.autolikestatus) {
        try {
          const emojis = settings.likeEmojis.split(" ").filter(Boolean);
          const emoji = emojis[Math.floor(Math.random() * emojis.length)] || "❤️";
          await (sock as any).sendMessage("status@broadcast", {
            react: { text: emoji, key: { remoteJid: "status@broadcast", id: status.id, participant: status.from } },
          });
        } catch (_) {}
      }
    }
  });
}

export async function initiatePairing(userId: string, phone: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const authDir = getAuthDir(userId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger as any),
      },
      printQRInTerminal: false,
      logger: logger as any,
      browser: ["NUTTER-XMD", "Chrome", "4.0.0"],
      syncFullHistory: false,
    });

    const instance: BotInstance = { socket: sock, userId, phone, isFirstConnection: true };
    botInstances.set(userId, instance);
    sock.ev.on("creds.update", saveCreds);

    pendingPairings.set(userId, { resolve, reject });

    setTimeout(async () => {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const code = await sock.requestPairingCode(cleanPhone);
        if (code) {
          const pending = pendingPairings.get(userId);
          if (pending) {
            pending.resolve(code);
            pendingPairings.delete(userId);
          }
        }
      } catch (err) {
        const pending = pendingPairings.get(userId);
        if (pending) {
          pending.reject(err as Error);
          pendingPairings.delete(userId);
        }
      }
    }, 2000);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          setTimeout(() => createBotInstance(userId, phone, true, false), 5000);
        }
      }

      if (connection === "open") {
        logger.info({ userId }, "Paired and connected!");

        await db.update(usersTable)
          .set({ status: "active", lastSeen: new Date(), isFirstConnection: "false" })
          .where(eq(usersTable.id, userId));

        const jid = `${phone.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
        try {
          await sock.sendMessage(jid, {
            text: `✅ *NUTTER-XMD V.9.1.3* connected successfully!\n\nType *.menu* to get started ⚡\n\n_Powered by *NUTTER-XMD* ⚡_`,
          });
        } catch (_) {}

        handlePresence(sock, userId);

        const autoJoinGroup = process.env.NUTTER_AUTO_JOIN_GROUP;
        const autoJoinChannel = process.env.NUTTER_AUTO_JOIN_CHANNEL;
        if (autoJoinGroup) {
          try { await sock.groupAcceptInvite(autoJoinGroup); } catch (_) {}
        }
        if (autoJoinChannel) {
          try { await sock.newsletterFollow(autoJoinChannel); } catch (_) {}
        }

        sock.ev.on("messages.upsert", async ({ messages, type }) => {
          if (type !== "notify") return;
          for (const msg of messages) {
            if (!msg.message) continue;
            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
            if (!user || user.status !== "active") continue;
            const [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
            if (!settings) continue;
            if (settings.autoread) {
              try { await sock.readMessages([msg.key]); } catch (_) {}
            }
            const msgId = uuidv4();
            const chatId = msg.key.remoteJid || "";
            try {
              await db.insert(messagesTable).values({
                id: msgId, userId, chatId,
                messageId: msg.key.id || "",
                content: msg as any,
              });
            } catch (_) {}
            await handleProtection(sock, msg, settings, userId);
            await handleCommand(sock, msg, settings, userId);
          }
        });
      }
    });
  });
}

export async function restoreAllSessions(): Promise<void> {
  const users = await db.select().from(usersTable).where(eq(usersTable.status, "active"));
  logger.info({ count: users.length }, "Restoring bot sessions...");
  for (const user of users) {
    if (!user.sessionId) continue;
    const authDir = getAuthDir(user.id);
    if (!existsSync(authDir)) continue;
    logger.info({ userId: user.id, phone: user.phone }, "Restoring session...");
    await createBotInstance(user.id, user.phone, false, true).catch((err) =>
      logger.error({ err, userId: user.id }, "Failed to restore session")
    );
  }
}

export function cleanupExpiredMessages(): void {
  setInterval(async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    try {
      await db.delete(messagesTable).where(lt(messagesTable.createdAt, tenMinutesAgo));
      logger.info("Cleaned up expired messages");
    } catch (err) {
      logger.error({ err }, "Failed to clean messages");
    }
  }, 5 * 60 * 1000);
}
