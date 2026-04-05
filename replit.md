# NUTTER-XMD — WhatsApp Bot Platform

## Overview

Multi-user WhatsApp bot platform powered by Baileys (pairing-code flow). Users link via phone number → 8-digit code. Features 103 commands, protection handlers, automation, group management, a cyberpunk-branded web dashboard, and a password-protected admin panel.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in)
- **WhatsApp library**: @whiskeysockets/baileys (pairing-code flow, no QR scan)
- **Dashboard**: React + Vite + Tailwind CSS (cyberpunk dark theme)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`

## Architecture

### Artifacts

| Artifact | Port | Preview Path | Description |
|---|---|---|---|
| `api-server` | 8080 | — | Express API + Bot engine |
| `dashboard` | 23183 | `/` | React frontend |

### Key Files

- `artifacts/api-server/src/bot/manager.ts` — Multi-user Baileys session manager
- `artifacts/api-server/src/bot/protection.ts` — Anti-link/spam/sticker/tag/badword/delete handlers
- `artifacts/api-server/src/bot/presence.ts` — Always-online heartbeat
- `artifacts/api-server/src/bot/commands/index.ts` — 103-command router
- `artifacts/api-server/src/bot/commands/menu.ts` — .menu with 700×700 image
- `artifacts/api-server/src/bot/commands/settings.ts` — Bot settings commands
- `artifacts/api-server/src/bot/commands/group.ts` — Group management commands
- `artifacts/api-server/src/bot/commands/owner.ts` — Owner-only commands
- `artifacts/api-server/src/routes/bot.ts` — Pairing & status API
- `artifacts/api-server/src/routes/settings.ts` — Settings CRUD API
- `artifacts/api-server/src/routes/admin.ts` — Admin API (requires token)
- `artifacts/dashboard/src/pages/Home.tsx` — Pairing + Settings dashboard
- `artifacts/dashboard/src/pages/Admin.tsx` — Admin panel (user management)
- `lib/db/src/schema/` — Database schemas (users, user_settings, messages)

### Database Schema

- `users` — Bot users (id, phone, sessionId, status, isFirstConnection, linkedAt, lastSeen)
- `user_settings` — Per-user bot settings (prefix, mode, toggles, custom messages)
- `messages` — Cached messages with 10-min TTL for anti-delete recovery

## Features

### 103 Commands
- **AI** (12): gpt, gemini, deepseek, blackbox, code, analyze, summarize, translate, recipe, story, teach, generate
- **Downloads** (9): youtube, song, tiktok, instagram, twitter, facebook, gdrive, mediafire, image
- **Audio** (7): tomp3, toptt, bass, earrape, reverse, robot, deep
- **Fun** (7): fact, jokes, quotes, trivia, truth, dare, truthordare
- **Search** (6): weather, define, imdb, lyrics, yts, shazam
- **Tools** (22): sticker, emojimix, qrcode, tinyurl, calculate, genpass, say, getpp, fancy, fliptext, device, disk, ping, runtime, time, repo, botstatus, vv, vv2, test, alive, pair
- **Group** (14): kick, promote, demote, add, approve, invite, open, close, poll, tagall, hidetag, kickall, setgroupname, setdesc
- **Settings** (17): anticall, antilink, antisticker, antitag, antibadword, chatbot, autoread, alwaysonline, autoviewstatus, autolikestatus, autotype, antidelete, antispam, welcome, goodbye, setlikeemoji, mode, setprefix, setwelcome, setgoodbye, getsettings
- **Owner** (9): block, unblock, delete, warn, join, leave, online, setbio, restart

### Protection Handlers
- Anti-call (reject + custom message)
- Anti-link (delete + warn in groups, bot must be admin)
- Anti-sticker (delete in groups)
- Anti-tag (block @everyone/@all)
- Anti-badword (custom word list, delete + warn)
- Anti-spam (5 msgs/10s = warn, 10 msgs = kick)
- Anti-delete (recover deleted messages via 10-min cache)

### Automation
- Always online (heartbeat every 30s)
- Auto-view WhatsApp statuses
- Auto-like statuses with custom emoji set
- Auto-read messages
- Typing indicator while processing

### Group Management
- Welcome/goodbye messages (bot admin check + user admin check)
- All group commands require both bot AND sender to be admin

### Admin Panel
- URL: `/?admin=nutterx=true`
- Username/key login (credentials stored in env vars)
- View all users, stats (connected/paused/suspended counts)
- Pause, suspend, or delete any user
- User session and connection status tracking

## Environment Variables

| Variable | Value | Description |
|---|---|---|
| `ADMIN_USERNAME` | nutterx | Admin panel username |
| `ADMIN_KEY` | nutter-admin-2024 | Admin panel key (change in production) |
| `NUTTER_AUTO_JOIN_GROUP` | group invite code | Auto-join group on first connect |
| `NUTTER_AUTO_JOIN_CHANNEL` | channel ID | Auto-follow channel on first connect |
| `DATABASE_URL` | (secret) | PostgreSQL connection string |

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Notes

- **Session storage**: Only session ID in DB; Baileys auth state files in `sessions/` folder (ephemeral)
- **Message cache TTL**: 10 minutes, cleaned every 5 minutes
- **Startup message**: Only sent on FIRST ever connection; restarts are silent
- **Command prefix**: Default `.`, user-configurable via `.setprefix <char>`
- **protobufjs**: Installed as explicit dependency (externalized in esbuild, required at runtime by Baileys)
- **Menu image**: 700×700 PNG saved to `artifacts/api-server/public/menu-image.png` (cyberpunk aesthetic)
