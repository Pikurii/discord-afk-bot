import "dotenv/config";
import cron from "node-cron";
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } from "@discordjs/voice";
import { DateTime } from "luxon";
import generateMeme from "./meme.js";

const TOKEN = process.env.TOKEN?.trim();
const CHANNEL_ID = process.env.CHANNEL_ID?.trim();
const TEXT_CHANNEL_ID = process.env.TEXT_CHANNEL_ID?.trim();
const TIMEZONE = process.env.TZ || "Asia/Jakarta";

// --- VALIDASI AWAL ENVIRONMENT VARIABLES ---
const missingEnv = [
    !TOKEN && "TOKEN",
    !CHANNEL_ID && "CHANNEL_ID",
    !TEXT_CHANNEL_ID && "TEXT_CHANNEL_ID",
    !process.env.START_DATE && "START_DATE"
].filter(Boolean);

if (missingEnv.length > 0) {
    console.error(`[VALIDASI] Env belum lengkap. Variabel yang kurang: ${missingEnv.join(", ")}`);
    console.error("[VALIDASI] Di Railway, isi variabel tersebut di Settings > Variables / Environment.");
    process.exit(1);
}

const start = DateTime.fromISO(process.env.START_DATE, { zone: TIMEZONE });
if (!start.isValid) {
    console.error("[VALIDASI] Eror: Format START_DATE salah (Harus YYYY-MM-DD)!");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let isConnecting = false;
let reconnectTimer = null;
let disconnectAttempts = 0;
let lastRecoveryAt = 0;
let lastDisconnectAt = 0;
let recoveryCooldownActive = false;

const getReconnectDelay = () => {
    const attempt = Math.min(disconnectAttempts, 5);
    return [2000, 3000, 5000, 7000, 10000][attempt - 1] || 10000;
};

const scheduleReconnect = () => {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }

    const now = Date.now();
    const cooldown = now - lastRecoveryAt < 2000 ? 2000 : 0;
    const delay = Math.max(getReconnectDelay(), cooldown);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        lastRecoveryAt = Date.now();
        console.log(`[RECOVER] Mencoba reconnect ke voice channel (upaya ${disconnectAttempts}) setelah ${delay}ms...`);
        connectToVoice();
    }, delay);
};

const markDisconnect = () => {
    const now = Date.now();
    if (lastDisconnectAt && now - lastDisconnectAt < 15_000) {
        recoveryCooldownActive = true;
    } else {
        recoveryCooldownActive = false;
    }
    lastDisconnectAt = now;
};

const resetReconnectState = () => {
    disconnectAttempts = 0;
    lastDisconnectAt = 0;
    recoveryCooldownActive = false;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
};

// --- FUNGSI PENJAGA VOICE CHANNEL 24/7 ---
const connectToVoice = async () => {
    if (isConnecting) return;

    try {
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel || !channel.guild) {
            console.error(`[GUARD] Gagal: Voice Channel ID tidak ditemukan di server atau bot tidak punya akses membaca channel.`);
            isConnecting = false;
            return;
        }

        const existingConnection = getVoiceConnection(channel.guild.id);
        if (existingConnection && existingConnection.state.status === VoiceConnectionStatus.Ready) {
            resetReconnectState();
            console.log(`[GUARD] Sudah terhubung di VC ${channel.name}, melewati reconnect.`);
            isConnecting = false;
            return;
        }

        // Cek Izin Tambahan untuk Masuk ke VC
        const permissions = channel.permissionsFor(client.user);
        if (!permissions || !permissions.has('Connect')) {
            console.error(`[GUARD] Eror: Bot tidak memiliki izin (Permission) 'Connect' di channel ${channel.name}!`);
            isConnecting = false;
            return;
        }

        isConnecting = true;
        console.log(`[GUARD] Mencoba mengamankan Voice Channel: ${channel.name}...`);

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: process.env.SELF_DEAF === "true",
            selfMute: process.env.SELF_MUTE === "true",
        });

        connection.once(VoiceConnectionStatus.Ready, () => {
            resetReconnectState();
            console.log(`[GUARD] Bot sukses terhubung di VC ${channel.name}!`);
            isConnecting = false;
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            disconnectAttempts += 1;
            markDisconnect();
            console.log(`[GUARD] Deteksi Terputus! Memulai reconnect ke-${disconnectAttempts}...`);
            connection.destroy();
            isConnecting = false;
            scheduleReconnect();
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            disconnectAttempts += 1;
            markDisconnect();
            console.log(`[GUARD] Koneksi voice dihancurkan. Menyiapkan reconnect ke-${disconnectAttempts}...`);
            isConnecting = false;
            scheduleReconnect();
        });

        connection.on('error', error => {
            disconnectAttempts += 1;
            markDisconnect();
            console.error(`[ERROR] Masalah pada jaringan suara Discord: ${error.message}`);
            isConnecting = false;
            scheduleReconnect();
        });

    } catch (e) {
        disconnectAttempts += 1;
        console.error(`[ERROR] Gagal total saat mencoba masuk Voice: ${e.message}`);
        isConnecting = false;
        scheduleReconnect();
    }
};

// --- DETEKTOR ANTI-KICK & ANTI-MOVE ---
client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.id === client.user.id) {
        if (!newState.channelId) {
            console.log(`[ANTI-KICK] Seseorang telah memutus bot dari VC! Menyerahkan pemulihan ke sistem recovery...`);
            // Biarkan connection.on('Disconnected') atau Heartbeat yang mengeksekusi agar rapi satu pintu
        } 
        else if (newState.channelId !== CHANNEL_ID) {
            console.log(`[ANTI-MOVE] Bot dipindahkan! Menghancurkan koneksi salah agar memicu sistem recovery otomatis...`);
            const connection = getVoiceConnection(newState.guild.id);
            if (connection) {
                isConnecting = false;
                connection.destroy(); // Biarkan event 'Destroyed' yang mengurus panggilan connectToVoice via scheduleReconnect()
            } else {
                isConnecting = false;
                connectToVoice();
            }
        }
    }
});

// --- FUNGSI UTAMA GENERATE MEME ---
const sendMemeAction = async (targetChannelId, isManual = false) => {
    try {
        const now = DateTime.now().setZone(TIMEZONE);
        const diff = Math.floor(now.startOf('day').diff(start.startOf('day'), 'days').days) + 1;
        
        const textAtas = `DAY ${diff} NGANGGUR`;
        const textBawah = `YAA.... HARI KE-${diff}`;
        
        const imageBuffer = await generateMeme("./assets/images/mr_crab.jpg", textAtas, textBawah);
        const textChannel = await client.channels.fetch(targetChannelId).catch(() => null);
        
        if (textChannel && typeof textChannel.send === 'function') {
            await textChannel.send({
                content: isManual ? `🔄 **[TEST EXECUTION]** Hasil generate gambar untuk hari ini:` : undefined,
                files: [{
                    attachment: imageBuffer,
                    name: `day-${diff}-nganggur.jpg`
                }]
            });
            console.log(`[SYSTEM] Sukses mengirimkan meme Day ${diff}! (Manual: ${isManual})`);
            return true;
        } else {
            console.error("[SYSTEM] Gagal mengirim: Text channel target tidak ditemukan atau bot tidak punya izin kirim chat.");
            return false;
        }
    } catch (e) {
        console.error("[SYSTEM] Terjadi kesalahan saat eksekusi pembuatan meme:", e.message);
        throw e;
    }
};

client.on('ready', async () => {
    console.log(`==================================================`);
    console.log(`[SYSTEM] Bot resmi aktif sebagai ${client.user.tag}!`);
    console.log(`==================================================`);
    
    await connectToVoice();
    
    // Heartbeat lebih aktif setiap 3 menit untuk menjaga voice tetap stabil
    setInterval(async () => {
        console.log(`[HEARTBEAT] Memeriksa status keaktifan di Voice Channel...`);
        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (channel && channel.guild) {
            const connection = getVoiceConnection(channel.guild.id);

            if (!connection) {
                console.log(`[HEARTBEAT] Koneksi tidak ditemukan. Memaksa masuk ulang...`);
                await connectToVoice();
            } else if (connection.state.status !== VoiceConnectionStatus.Ready) {
                console.log(`[HEARTBEAT] Koneksi tidak stabil. Memaksa masuk ulang...`);
                if (connection) connection.destroy();
                isConnecting = false;
                await connectToVoice();
            } else {
                connection.configureNetworking();
                if (recoveryCooldownActive) {
                    console.log(`[HEARTBEAT] Gangguan berulang terdeteksi, menjaga recovery lebih agresif.`);
                } else {
                    console.log(`[HEARTBEAT] Koneksi aman dan aktif.`);
                }
            }
        }
    }, 3 * 60 * 1000); // Cek setiap 3 menit
});

// --- FITUR MANUAL COMMAND ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!ceknganggur') {
        await message.reply("⏳ Sedang memproses gambar, mohon tunggu...");
        try {
            const success = await sendMemeAction(TEXT_CHANNEL_ID, true);
            if (success) {
                await message.channel.send("✅ Berhasil dikirim! Silakan cek hasil editannya.");
            } else {
                await message.reply("❌ Gagal mengirim. Pastikan konfigurasi ID di `.env` sudah sesuai.");
            }
        } catch (err) {
            await message.reply(`❌ Terjadi eror: ${err.message}`);
        }
    }
});

// --- PENJADWALAN OTOMATIS (CRON) ---
cron.schedule(process.env.CRON, async () => {
    console.log("[CRON] Menjalankan tugas otomatis subuh...");
    await sendMemeAction(TEXT_CHANNEL_ID, false);
}, {
    scheduled: true,
    timezone: TIMEZONE
});

// --- PENANGANAN EROR LOGIN (Saran Akhir AI VS Code) ---
client.login(TOKEN).catch((error) => {
    console.error(`[CRON] Gagal melakukan autentikasi login ke Discord: ${error.message}`);
    console.error(`[CRON] Silakan periksa kembali apakah TOKEN di .env Anda masih aktif.`);
    process.exit(1);
});