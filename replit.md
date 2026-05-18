# Sumbing Weather Discord Bot

## Overview
A Discord bot that provides automated voice announcements and real-time weather rotation updates within Discord voice channels. Built with TypeScript/Node.js, discord.js v14, and Redis for persistence.

## Architecture
- **Language**: TypeScript (compiled to `dist/`)
- **Runtime**: Node.js 22
- **Discord**: discord.js v14 + @discordjs/voice for audio/TTS announcements
- **Persistence**: Redis (stores server configs and timer states)
- **Error tracking**: Sentry (optional)

## Required Environment Variables / Secrets
- `DISCORD_TOKEN` — Discord bot token (required)
- `REDIS_URL` — Redis connection URL, e.g. `redis://localhost:6379` (required)
- `SENTRY_DSN` — Sentry DSN for error tracking (optional)
- `BOT_ID` — Bot instance ID, defaults to "1" (optional)
- `LOG_SPEAK` — Set to "true" to log voice speak events (optional)

## Running the Bot
- `npm start` — Run from compiled `dist/` folder
- `npm run build` — Compile TypeScript (note: some source `.ts` util files are missing; use pre-compiled `dist/` directly)
- `npm run dev` — Development mode with auto-restart on changes

## Notes
- The `dist/` folder contains pre-compiled JavaScript and includes utility modules whose `.ts` sources are not present in the repo
- Redis must be accessible before the bot starts (`redisClient.waitForConnection()` is called on startup)

## User Preferences
