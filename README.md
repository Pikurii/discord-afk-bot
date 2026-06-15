# 🦀 Si Krab Nganggur Bot (Discord AFK & Auto-Meme Bot)

[![Railway Deploy](https://img.shields.io/badge/Railway-Deployed-indigo?style=for-the-badge&logo=railway)](https://railway.app/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue?style=for-the-badge&logo=discord)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)

**Si Krab Nganggur Bot** is a personal Discord bot built with Node.js, specifically designed to secure 24/7 Voice Channel duration stats on a Discord server while automatically tracking and counting milestone days using dynamically generated memes.

The bot runs completely in the cloud on Railway, utilizing the Nixpacks container build system to ensure 24/7 uptime without consuming any local hardware resources.

---

## 🎯 Key Features

* **⚡ 24/7 Voice Channel Guard:** Automatically joins the designated Voice Channel upon startup and stays connected indefinitely to keep the server's voice activity active.
* **🛡️ Smart Anti-Kick & Anti-Move Protection:** If a server moderator or another management bot disconnects or moves this bot, it clean up the corrupted session and routes directly through the centralized recovery system to rejoin the main channel instantly.
* **🔄 Advanced Error Recovery (Exponential Backoff):** Built with an industry-standard retry state machine. If Discord or Railway experiences network drops, the bot dynamically scales its reconnect delays (2s, 3s, 5s, 7s, up to 10s) to avoid API spamming and rate limits.
* **📡 Flapping & Rate-Limit Protection:** Automatically monitors high-frequency disconnections (within a 15-second window). If the network goes unstable, it triggers a cooldown state to safeguard the bot's token from getting temporary IP bans.
* **⏱️ Active Keep-Alive Heartbeat:** Runs an aggressive check every 3 minutes. Even though the bot is completely silent, it fires a native background `configureNetworking()` signal to clear any idle voice timeouts imposed by Discord's gateway.
* **🔇 Silent & Self-Deafened Mode:** Joins the voice channel as self-muted and self-deafened, ensuring server privacy and zero voice bandwidth consumption.
* **📅 Automated Daily Meme Generator (Cron Job):** Powered by the native `canvas` graphics library, the bot dynamically edits a baseline template image of Mr. Krab, rendering updated day counters (`DAY 1`, `DAY 2`, etc.) and posting it automatically every day at **03:00 AM WIB (Asia/Jakarta)**.
* **💬 On-Demand Manual Check:** Includes an interactive `!ceknganggur` text command allowing server members to manually test and trigger the image generation instantly.

---

## 🛠️ Built With

* **Runtime:** Node.js (v20)
* **Core Library:** `discord.js` (v14) & `@discordjs/voice` (for handling voice connections)
* **Graphics Engine:** `canvas` (for rendering dynamic text onto image assets)
* **Scheduler:** `node-cron` (for triggering the automated daily 3 AM task)
* **Timezone Handler:** `luxon` (to precisely sync with Western Indonesian Time / Asia/Jakarta)
* **Deployment Engine:** Nixpacks (for providing underlying Linux system graphics dependencies like `cairo` & `pango` on Railway)

---

## ⚙️ Environment Variables

To keep sensitive configuration details secure, all required settings must be configured via the platform's environment variables panel:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `TOKEN` | The secret application token from the Discord Developer Portal | `MTUxMzY5...` |
| `CHANNEL_ID` | Unique ID of the target Voice Channel where the bot will stay | `1515933402270924820` |
| `TEXT_CHANNEL_ID` | Unique ID of the Text Channel where the bot will post memes | `1515933402270924820` |
| `START_DATE` | Base date to begin the day counter calculations (YYYY-MM-DD) | `2026-06-15` |
| `CRON` | Execution schedule for the automatic meme generator | `0 3 * * *` |
| `TZ` | Target server environment timezone | `Asia/Jakarta` |
| `SELF_MUTE` | Keeps the bot muted while inside a voice channel | `true` |
| `SELF_DEAF` | Keeps the bot deafened while inside a voice channel | `true` |

---

## 🚀 Deployment & Local Setup

### 1. Prerequisites (Discord Developer Portal)
1. Create a new application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Navigate to the **Bot** tab and enable all **Privileged Gateway Intents** (`Presence`, `Server Members`, and `Message Content`).
3. Copy your Bot Token and save it securely.
4. Invite the bot to your guild using the **OAuth2 URL Generator** tool by selecting the `bot` scope along with the following permissions: `Connect`, `Speak`, `Send Messages`, and `View Channels`.

### 2. Local Development Setup
If you want to run the project locally on your machine:
1. Clone or download this repository.
2. Create a `.env` file in the root directory and populate it with the required environment variables listed above.
3. Install the project dependencies:
   ```bash
   npm install
4. Start the application:
   ```bash
   npm start

### 4. Deploying to Cloud (Railway)
1. Push this entire codebase to your personal public/private GitHub repository (ensure your .env file is excluded via .gitignore).
2. Log into Railway.app and create a new project via Deploy from GitHub repo.
3. Head over to the Variables tab on Railway, open the Raw Editor, and paste all environment configurations cleanly without quotation marks.
4. Railway will automatically process the nixpacks.toml file to compile the required Linux graphics packages. Your bot will be up and running 24/7!

💬 Chat Commands
!ceknganggur – Triggers the bot to immediately generate and reply with the processed Mr. Krab meme representing the current day count milestone elapsed since the START_DATE.
