import { WASocket, proto } from "@whiskeysockets/baileys";
import { UserSettings } from "@workspace/db";

function normalizeJid(jid: string): string {
  return jid.replace(/:[\d]+@/, "@");
}

const spamTracker = new Map<string, { count: number; lastTime: number }>();

export async function handleProtection(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  settings: UserSettings,
  _userId: string
): Promise<void> {
  const chatId = msg.key.remoteJid;
  if (!chatId) return;

  const isGroup = chatId.endsWith("@g.us");
  const sender = msg.key.participant || msg.key.remoteJid || "";
  const messageContent = msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption || "";

  if (isGroup) {
    const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
    if (!groupMeta) return;

    const botJid = normalizeJid(sock.user?.id || "");
    const botPart = groupMeta.participants.find(p => normalizeJid(p.id) === botJid);
    const isBotAdmin = botPart?.admin === "admin" || botPart?.admin === "superadmin";
    if (!isBotAdmin) return;

    if (settings.antilink) {
      const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
      if (urlRegex.test(messageContent)) {
        await sock.sendMessage(chatId, {
          delete: msg.key,
        }).catch(() => {});
        await sock.sendMessage(chatId, {
          text: `⚠️ @${sender.split("@")[0]} Links are not allowed in this group!`,
          mentions: [sender],
        }).catch(() => {});
        return;
      }
    }

    if (settings.antisticker && msg.message?.stickerMessage) {
      await sock.sendMessage(chatId, { delete: msg.key }).catch(() => {});
      return;
    }

    if (settings.antitag) {
      const text = messageContent.toLowerCase();
      if (text.includes("@everyone") || text.includes("@all")) {
        await sock.sendMessage(chatId, { delete: msg.key }).catch(() => {});
        await sock.sendMessage(chatId, {
          text: `⚠️ @${sender.split("@")[0]} Tagging everyone is not allowed!`,
          mentions: [sender],
        }).catch(() => {});
        return;
      }
    }

    if (settings.antibadword && settings.badwords) {
      const words = settings.badwords as string[];
      const lower = messageContent.toLowerCase();
      if (words.some(w => lower.includes(w.toLowerCase()))) {
        await sock.sendMessage(chatId, { delete: msg.key }).catch(() => {});
        await sock.sendMessage(chatId, {
          text: `⚠️ @${sender.split("@")[0]} That language is not allowed here!`,
          mentions: [sender],
        }).catch(() => {});
        return;
      }
    }

    if (settings.antispam) {
      const now = Date.now();
      const key = `${sender}:${chatId}`;
      const tracker = spamTracker.get(key) || { count: 0, lastTime: now };

      if (now - tracker.lastTime < 10000) {
        tracker.count++;
      } else {
        tracker.count = 1;
        tracker.lastTime = now;
      }

      spamTracker.set(key, tracker);

      if (tracker.count >= 5) {
        await sock.sendMessage(chatId, {
          text: `⚠️ @${sender.split("@")[0]} You've been warned for spamming! (${tracker.count} messages in 10s)`,
          mentions: [sender],
        }).catch(() => {});

        if (tracker.count >= 10) {
          await sock.groupParticipantsUpdate(chatId, [sender], "remove").catch(() => {});
          spamTracker.delete(key);
        }
      }
    }
  }
}
