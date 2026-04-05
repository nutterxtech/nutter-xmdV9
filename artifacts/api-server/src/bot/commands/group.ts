import { WASocket, proto } from "@whiskeysockets/baileys";
import { UserSettings } from "@workspace/db";

function normalizeJid(jid: string): string {
  return jid.replace(/:[\d]+@/, "@");
}

async function checkAdminPerms(sock: WASocket, chatId: string, sender: string): Promise<{ ok: boolean; reason?: string }> {
  if (!chatId.endsWith("@g.us")) {
    return { ok: false, reason: "❌ This command can only be used in groups!" };
  }
  const meta = await sock.groupMetadata(chatId).catch(() => null);
  if (!meta) return { ok: false, reason: "❌ Could not fetch group info." };

  const botJid = normalizeJid(sock.user?.id || "");
  const normalizedSender = normalizeJid(sender);
  const bot = meta.participants.find(p => normalizeJid(p.id) === botJid);
  const user = meta.participants.find(p => normalizeJid(p.id) === normalizedSender);

  if (!bot || (bot.admin !== "admin" && bot.admin !== "superadmin")) {
    return { ok: false, reason: "❌ I need to be a group admin to do that!" };
  }
  if (!user || (user.admin !== "admin" && user.admin !== "superadmin")) {
    return { ok: false, reason: "❌ You need to be an admin to use this command!" };
  }
  return { ok: true };
}

export async function handleGroupCommand(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  settings: UserSettings,
  _userId: string,
  command: string,
  args: string[]
): Promise<void> {
  const chatId = msg.key.remoteJid!;
  const sender = msg.key.participant || msg.key.remoteJid || "";
  const prefix = settings.prefix || ".";

  const { ok, reason } = await checkAdminPerms(sock, chatId, sender);
  if (!ok) {
    await sock.sendMessage(chatId, { text: reason! }, { quoted: msg }).catch(() => {});
    return;
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

  const targets = mentioned.length > 0 ? mentioned : (quoted ? [quoted] : []);

  switch (command) {
    case "kick": {
      if (targets.length === 0) {
        await sock.sendMessage(chatId, { text: `Usage: ${prefix}kick @user` }, { quoted: msg }).catch(() => {});
        return;
      }
      await sock.groupParticipantsUpdate(chatId, targets, "remove").catch(() => {});
      await sock.sendMessage(chatId, {
        text: `✅ Kicked: ${targets.map(t => "@" + t.split("@")[0]).join(", ")}`,
        mentions: targets,
      }, { quoted: msg }).catch(() => {});
      break;
    }
    case "promote": {
      if (targets.length === 0) {
        await sock.sendMessage(chatId, { text: `Usage: ${prefix}promote @user` }, { quoted: msg }).catch(() => {});
        return;
      }
      await sock.groupParticipantsUpdate(chatId, targets, "promote").catch(() => {});
      await sock.sendMessage(chatId, {
        text: `✅ Promoted to admin: ${targets.map(t => "@" + t.split("@")[0]).join(", ")}`,
        mentions: targets,
      }, { quoted: msg }).catch(() => {});
      break;
    }
    case "demote": {
      if (targets.length === 0) {
        await sock.sendMessage(chatId, { text: `Usage: ${prefix}demote @user` }, { quoted: msg }).catch(() => {});
        return;
      }
      await sock.groupParticipantsUpdate(chatId, targets, "demote").catch(() => {});
      await sock.sendMessage(chatId, {
        text: `✅ Demoted from admin: ${targets.map(t => "@" + t.split("@")[0]).join(", ")}`,
        mentions: targets,
      }, { quoted: msg }).catch(() => {});
      break;
    }
    case "add": {
      const phone = args[0]?.replace(/[^0-9]/g, "");
      if (!phone) {
        await sock.sendMessage(chatId, { text: `Usage: ${prefix}add <phone number>` }, { quoted: msg }).catch(() => {});
        return;
      }
      await sock.groupParticipantsUpdate(chatId, [`${phone}@s.whatsapp.net`], "add").catch(() => {});
      await sock.sendMessage(chatId, { text: `✅ Added +${phone}` }, { quoted: msg }).catch(() => {});
      break;
    }
    case "open": {
      await sock.groupSettingUpdate(chatId, "unlocked").catch(() => {});
      await sock.sendMessage(chatId, { text: "✅ Group opened — anyone can send messages!" }, { quoted: msg }).catch(() => {});
      break;
    }
    case "close": {
      await sock.groupSettingUpdate(chatId, "announcement").catch(() => {});
      await sock.sendMessage(chatId, { text: "✅ Group closed — only admins can send messages!" }, { quoted: msg }).catch(() => {});
      break;
    }
    case "invite": {
      const link = await sock.groupInviteCode(chatId).catch(() => null);
      if (link) {
        await sock.sendMessage(chatId, { text: `🔗 Group Invite Link:\nhttps://chat.whatsapp.com/${link}` }, { quoted: msg }).catch(() => {});
      }
      break;
    }
    case "tagall": {
      const meta = await sock.groupMetadata(chatId).catch(() => null);
      if (!meta) return;
      const participants = meta.participants.map(p => p.id);
      const text = args.join(" ") || "📢 Attention everyone!";
      const mentionText = `${text}\n\n` + participants.map(p => `@${p.split("@")[0]}`).join(" ");
      await sock.sendMessage(chatId, { text: mentionText, mentions: participants }, { quoted: msg }).catch(() => {});
      break;
    }
    case "hidetag": {
      const meta = await sock.groupMetadata(chatId).catch(() => null);
      if (!meta) return;
      const participants = meta.participants.map(p => p.id);
      const text = args.join(" ") || "📢 Attention!";
      await sock.sendMessage(chatId, { text, mentions: participants }, { quoted: msg }).catch(() => {});
      break;
    }
    case "kickall": {
      const meta = await sock.groupMetadata(chatId).catch(() => null);
      if (!meta) return;
      const botJid = normalizeJid(sock.user?.id || "");
      const others = meta.participants.filter(p => normalizeJid(p.id) !== botJid && p.admin !== "admin" && p.admin !== "superadmin").map(p => p.id);
      if (others.length > 0) {
        await sock.groupParticipantsUpdate(chatId, others, "remove").catch(() => {});
        await sock.sendMessage(chatId, { text: `✅ Kicked ${others.length} members!` }, { quoted: msg }).catch(() => {});
      }
      break;
    }
    case "setgroupname": {
      const name = args.join(" ").trim();
      if (!name) {
        await sock.sendMessage(chatId, { text: `Usage: ${prefix}setgroupname <name>` }, { quoted: msg }).catch(() => {});
        return;
      }
      await sock.groupUpdateSubject(chatId, name).catch(() => {});
      await sock.sendMessage(chatId, { text: `✅ Group name set to: *${name}*` }, { quoted: msg }).catch(() => {});
      break;
    }
    case "setdesc": {
      const desc = args.join(" ").trim();
      await sock.groupUpdateDescription(chatId, desc || "").catch(() => {});
      await sock.sendMessage(chatId, { text: `✅ Group description updated!` }, { quoted: msg }).catch(() => {});
      break;
    }
    case "poll": {
      const pollText = args.join(" ");
      const pollParts = pollText.split("|").map(s => s.trim());
      if (pollParts.length < 3) {
        await sock.sendMessage(chatId, { text: `Usage: ${prefix}poll Question | Option1 | Option2 | ...` }, { quoted: msg }).catch(() => {});
        return;
      }
      await sock.sendMessage(chatId, {
        poll: {
          name: pollParts[0],
          values: pollParts.slice(1),
          selectableCount: 1,
        },
      }).catch(() => {});
      break;
    }
    case "approve": {
      await sock.groupRequestParticipantsList(chatId)
        .then(async requests => {
          if (requests.length > 0) {
            await sock.groupRequestParticipantsUpdate(chatId, requests.map(r => r.jid), "approve");
            await sock.sendMessage(chatId, { text: `✅ Approved ${requests.length} join requests!` }, { quoted: msg });
          } else {
            await sock.sendMessage(chatId, { text: `ℹ️ No pending join requests.` }, { quoted: msg });
          }
        }).catch(() => {});
      break;
    }
    default:
      await sock.sendMessage(chatId, { text: `❓ Group command not recognized.` }, { quoted: msg }).catch(() => {});
  }
}
