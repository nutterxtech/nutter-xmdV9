import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrate.js";
import { restoreAllSessions, cleanupExpiredMessages } from "./bot/manager.js";
import { flushAllPendingKeys } from "./bot/db-auth-state.js";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server continues");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server continues");
});

// Flush all pending Signal key writes before the process exits so bots
// don't suffer "Bad MAC" decryption failures after a restart.
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown — flushing pending key writes...");
  try {
    await flushAllPendingKeys();
    logger.info("Key flush complete — exiting");
  } catch (err) {
    logger.error({ err }, "Error flushing keys during shutdown");
  }
  process.exit(0);
}
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT",  () => gracefulShutdown("SIGINT"));

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const publicDir = join(process.cwd(), "public");
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

const sessionsDir = join(process.cwd(), "sessions");
if (!existsSync(sessionsDir)) mkdirSync(sessionsDir, { recursive: true });

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "NUTTER-XMD API Server listening");

  cleanupExpiredMessages();

  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, "DB migration failed — server may be unstable");
  }

  try {
    await restoreAllSessions();
    logger.info("Bot sessions restored");
  } catch (err) {
    logger.error({ err }, "Failed to restore sessions");
  }
});
