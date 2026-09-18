# VPS deployment

This bot supports two deployment methods:

- **PM2 + system Redis**: lowest overhead and recommended for a small VPS.
- **Docker Compose + Redis container**: easiest to reproduce on a clean VPS.

The bot requires Node.js 22.12 or newer. Node.js `22.22.2` is pinned in `.nvmrc`.

## Option 1: PM2 and system Redis

Install the server prerequisites on Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y curl git redis-server build-essential
sudo systemctl enable --now redis-server
```

Redis must use persistent storage because it contains the global timer reference
and the admin-configured cycle duration. Enable append-only persistence in the
Redis configuration before starting the bot:

```text
appendonly yes
appendfsync everysec
```

After changing the configuration, restart Redis:

```bash
sudo systemctl restart redis-server
```

Install Node.js 22 using your preferred method. With `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install
nvm use
```

Copy the project to the VPS, then configure the environment:

```bash
cp .env.example .env
nano .env
```

At minimum, set:

```dotenv
DISCORD_TOKEN=your_real_discord_bot_token
REDIS_URL=redis://127.0.0.1:6379
```

Run the bundled setup:

```bash
bash deploy/setup-vps.sh
```

The script installs the locked npm dependencies, builds `dist/`, removes development packages, starts the bot with PM2, and saves the PM2 process list.

Enable PM2 after reboot:

```bash
pm2 startup
# Run the exact sudo command printed by PM2
pm2 save
```

Useful commands:

```bash
pm2 status
pm2 logs sumbing-weather-bot
pm2 restart sumbing-weather-bot --update-env
pm2 stop sumbing-weather-bot
```

For a later source update:

```bash
bash deploy/update-vps.sh
```

## Option 2: Docker Compose

Install Docker and the Docker Compose plugin, copy the project, then create `.env`:

```bash
cp .env.example .env
nano .env
```

For Compose, `REDIS_URL` is set internally to `redis://redis:6379`; the value in `.env` is overridden by the Compose file.

Start the bot:

```bash
docker compose up -d --build
```

View logs and stop it:

```bash
docker compose logs -f bot
docker compose down
```

Redis data is stored in the `redis-data` Docker volume and survives bot container rebuilds.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `REDIS_URL` | Yes | Redis connection URL |
| `BOT_ID` | No | Bot instance ID, defaults to `1` |
| `LOG_SPEAK` | No | Set to `true` to log TTS text |
| `SENTRY_DSN` | No | Optional Sentry DSN |
| `SENTRY_ENVIRONMENT` | No | Sentry environment name |

Never commit `.env` or paste the Discord token into logs or chat.

## Discord voice requirements

The bot needs these permissions in the target server:

- View Channel
- Send Messages
- Manage Messages
- Connect
- Speak

The bot stays in a voice channel until `/leave` is used. `/weather stop` stops the weather timer but does not disconnect the bot.