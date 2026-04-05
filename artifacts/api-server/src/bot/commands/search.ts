import { WASocket, proto } from "@whiskeysockets/baileys";
import { UserSettings } from "@workspace/db";

export async function handleSearchCommand(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  settings: UserSettings,
  _userId: string,
  command: string,
  args: string[]
): Promise<void> {
  const chatId = msg.key.remoteJid!;
  const prefix = settings.prefix || ".";
  const query = args.join(" ").trim();

  const responses: Record<string, string> = {
    weather: query
      ? `🌤️ *Weather: ${query}*\n\nThis feature requires a weather API key.\n\nTo check weather: ${prefix}weather <city>\n\n_NUTTER-XMD ⚡_`
      : `Usage: ${prefix}weather <city>\nExample: ${prefix}weather London`,
    define: query
      ? `📖 *Definition: ${query}*\n\nThis feature requires a dictionary API.\n\nUsage: ${prefix}define <word>\n\n_NUTTER-XMD ⚡_`
      : `Usage: ${prefix}define <word>`,
    imdb: query
      ? `🎬 *IMDB Search: ${query}*\n\nThis feature requires an IMDB API key.\n\n_NUTTER-XMD ⚡_`
      : `Usage: ${prefix}imdb <movie name>`,
    lyrics: query
      ? `🎵 *Lyrics: ${query}*\n\nThis feature requires a lyrics API.\n\n_NUTTER-XMD ⚡_`
      : `Usage: ${prefix}lyrics <song name>`,
    yts: query
      ? `🎬 *YTS: ${query}*\n\nThis feature requires the YTS API.\n\n_NUTTER-XMD ⚡_`
      : `Usage: ${prefix}yts <movie name>`,
    shazam: `🎵 *Shazam*\n\nReply to a voice message to identify the song!\n\n⚠️ This feature requires additional setup.\n\n_NUTTER-XMD ⚡_`,
  };

  await sock.sendMessage(chatId, {
    text: responses[command] || `🔍 Search: *${command}*\n\n_NUTTER-XMD ⚡_`,
  }, { quoted: msg }).catch(() => {});
}
