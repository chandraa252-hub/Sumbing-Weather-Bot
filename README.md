# Sumbing Weather Discord Bot

This Discord bot was built to provide weather information and voice-based instructions inside a Discord voice channel. It helps users by giving automated announcements and real-time updates.

The bot joins a Discord call and delivers voice commands or information to everyone in the channel.

This project is a customized version of the original bot, adapted for specific use cases such as weather monitoring and automated voice notifications.
This project is based on the original TTT-Timer Discord Bot:
https://github.com/andipaetzold/tttt-discord

## Installation

Click here to invite the bot to your server:

https://discord.com/oauth2/authorize?client_id=1505002488409882684

You will be asked to grant multiple permissions:

| Permission      | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| Send Messages   | Allows the bot to send messages to a text channels                          |
| Manage Messages | Allows the bot to update messages for interactive behavior                  |
| Connect         | Allows the bot to join a voice channel                                      |
| Speak           | Allows the bot to send audio / voice to a voice channel                     |
                                                                                           

## Usage

- All commands are case insensitive.
- There is only one configuration per server. Changes made in any channel will affect the same configuration.

### Documentation Syntax

| Syntax                  | Meaning                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `<weather>` or `<time>` | Required parameter                                                     |
| `[<weather>]`           | Optional parameter                                                     |
| `@user`                 | Represents a Discord mention                                           |


### Commands

#### `/weathers [<weather1>] [<time1>] [<weather2>] [<time2>] ...`

If all options are omitted, returns the configured weather list.

Otherwise, sets the list of weather types and their rotation durations. Time values are optional and default to 210s for extreme weather and 480s for normal weather.

Example:

```bash
/weathers weather1:extreme weather time1:210 weather2:normal weather time2:480
```

The rotation now includes multiple weather types with custom durations.

---

#### `/help`

Shows a list of available commands, project links, and developer information.

Example output:

```bash
/start — Start the weather timer. Join a voice channel first.
/stop — Stop the timer and disconnect from voice.
/weathers — View or set weather names and rotation durations.
/help — Show this help message.
/reset — Stop the timer and reset all server configuration.
/skip — Skip to the next weather in the rotation.
/status — Show current timer status.
/leave — Force disconnect bot from voice channel.
/language — Set the announcement language.

Discord Server (Questions/Feedback)
https://discord.gg/jB3J3xfmGf

Full Documentation
https://github.com/chandraa252-hub/Sumbing-Weather-Timer

Web App
https://github.com/chandraa252-hub

Support this project
https://discord.com/users/762372166733529088

Made by Stephanus Chandra Wijaya
```

---

#### `/reset`

Stops the timer and resets all configuration of the bot for your server.

---

#### `/skip`

Skips the current weather in the rotation and moves to the next one.

If the timer hasn't started yet, this command will immediately start the process.

---

#### `/start`

Starts the weather timer. The bot joins your current voice channel or uses the previous one.

---

#### `/stop`

Stops the timer and leaves the voice channel.

---

#### `/leave`

Force disconnects the bot from the current voice channel.

This command is useful if `/stop` stops the timer but the bot remains connected to the voice channel due to a Discord voice connection issue.

---

#### `/status`

Displays the current timer status.

---

#### `/language [<language>]`

Shows or changes the current announcement language.

Available languages:
- `en-gb` — English (British)
- `en-us` — English (US)
- `id` — Indonesian

Changing the language automatically updates:
- Voice announcements (TTS)
- Spoken accent and pronunciation
- Help messages
- Status messages
- Weather names and labels

For example, selecting `id` changes all announcements into Indonesian and uses Indonesian voice pronunciation for TTS audio playback.

Example:
```bash
/language id
```

Example /start message in Indonesian:
Cuaca Saat Ini
🌩️ Cuaca Buruk
(3m 23s lagi)

Cuaca Selanjutnya
🌤️ Cuaca Cerah
⠀

⚠️ Bersiaplah menghadapi perubahan cuaca mendadak.
Berhati-hati saat cuaca badai petir.
⠀
☕ STMJ dianjurkan saat cuaca malam hari.
Durasi efek STMJ: 5 menit.
⠀
🪨 Di Watu Kotak, STMJ + Obor diperlukan
saat Cuaca Buruk antara pukul 02:00 - 04:00.

Kontrol:
⏭️ Ganti saat cuaca berubah ke kondisi cerah atau kemarau
⏹️ Hentikan timer cuaca atau gunakan /stop

---


## Status Message

When starting the timer using `/timer start`, a message is sent to the current channel. This message automatically updates and shows the current weather, the next weather, and additional information or warnings.

Example:

```text
Current Weather
🌤️ Normal Weather (7m 14s remaining)

Next Weather
🌩️ Extreme Weather


⚠️ Stay prepared for sudden weather changes. ⚠️
Be careful during thunderstorm weather.

☕ STMJ is recommended during nighttime weather.
STMJ effect duration: 5 minutes.

🪨 In Watu Kotak, STMJ + Torch is required
during Extreme Weather between 02:00 - 04:00.

Controls:
⏭️ Skip to advance when weather changes to normal or dry conditions
⏹️ Stop the weather timer or use /timer stop
```

The message will continuously update based on the current timer and weather rotation.

The bot automatically reacts with control emojis to this message. These can be used as buttons to control the bot without typing commands.

| Emoji | Equivalent Slash Command | Note                                      |
| ----- | ------------------------ | ----------------------------------------- |
| ⏭️    | `/timer skip`           | Skip to the next weather in the rotation  |
| ⏹️    | `/timer stop`           | Stop the timer and disconnect the bot     |


## Voice Commands

The bot automatically gives voice notifications 1/5/10/15/30 seconds and 1/3/5/10 minutes before a weather change or before the timer starts.

A voice notification is also played when:
- the timer starts
- switching to the next weather
- skipping the current weather

## Parallel Timers

Discord does not allow a bot to join multiple voice channels at the same time.

To run multiple timers in parallel on the same server, you can use more than one bot instance.

| Bot              | Description                         | Install Link                                                                 |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Sumbing Timer    | Main weather timer bot              | https://discord.com/oauth2/authorize?client_id=1505002488409882684          |
| TTT-Timer (Andi) | Backup timer (alternative instance) | https://discord.com/api/oauth2/authorize?client_id=806979974594560060&permissions=3155968&scope=bot+applications.commands |

The backup bot behaves similarly but runs independently with its own configuration.

---

## Data Privacy

This bot does not store or log any personal data outside of what is required for its functionality.

All configurations are temporary and tied to your server session. Removing the bot from your server will automatically remove all related data.

The source code of this project is publicly available on GitHub.

---

## Troubleshooting

| Problem                                      | Possible Solution                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| Slash commands are not visible               | Try reinviting the bot using the installation link                               |
| The bot does not respond to commands         | Make sure the bot has permission to read and send messages in the channel        |
| The timer does not start                     | Ensure you are connected to a voice channel before running `/timer start`        |
| The skip button does not work                | Make sure the bot has permission to manage messages and reactions                |
| The bot does not join voice channel          | Check voice channel permissions (Connect & Speak)

## Docker

The application is available on Docker Hub.

You can spin up your own instance of the bot using the following docker compose configuration:

```yaml
volumes:
    redis_data:

services:
    redis:
        image: redis:latest
        restart: always
        volumes:
            - redis_data:/data

    sumbing-weather-timer:
        image: <your-docker-image>
        restart: always
        environment:
            - DISCORD_TOKEN=<your_token>
            - REDIS_URL=redis://redis:6379
        links:
            - redis
        depends_on:
            - redis
```

> Note: Replace `<your-docker-image>` with your Docker Hub image after publishing.

---

## Need help?

Join the Discord server for questions, feedback, or support:

https://discord.gg/jB3J3xfmGf

Full Documentation:
https://github.com/chandraa252-hub/Sumbing-Weather-Timer

---

## Contact

**Stephanus Chandra Wijaya**

GitHub:  
https://github.com/chandraa252-hub  

Discord:  
https://discord.com/users/762372166733529088
