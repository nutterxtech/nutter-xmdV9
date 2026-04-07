/**
 * Filesystem-based WhatsApp auth state (Baileys useMultiFileAuthState).
 *
 * WhatsApp credentials are stored as files under sessions/{botId}/
 * The database stores ONLY the users/settings tables plus the
 * users.session_id column as a marker that a bot was successfully linked.
 * No credentials or Signal keys are ever written to the database.
 */

import { useMultiFileAuthState } from "@whiskeysockets/baileys";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const FS_AUTH_DIR = join(process.cwd(), "sessions");

function sessionDir(botId: string): string {
  const dir = join(FS_AUTH_DIR, botId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export type FilesystemAuthState = Awaited<ReturnType<typeof useMultiFileAuthState>> & {
  clearSession: () => Promise<void>;
};

export async function useFilesystemAuthState(botId: string): Promise<FilesystemAuthState> {
  const dir = sessionDir(botId);
  const result = await useMultiFileAuthState(dir);

  async function clearSession(): Promise<void> {
    try { rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  }

  return { ...result, clearSession };
}

/** True if a creds.json file exists for this bot on disk. */
export function hasStoredSession(botId: string): boolean {
  return existsSync(join(FS_AUTH_DIR, botId, "creds.json"));
}
