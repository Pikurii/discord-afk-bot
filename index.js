import "dotenv/config";
import cron from "node-cron";
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } from "@discordjs/voice";
import { DateTime } from "luxon";
import generateMeme from "./meme.js";

const TOKEN = process.env.TOKEN;
const VOICE_CHANNEL_ID = process.env.CHANNEL_ID;
const TEXT_CHANNEL_ID = process.env.TEXT_CHANNEL_ID;
const TIMEZONE = process.env.TZ || "Asia/Jakarta";

// --- VALIDASI AWAL ENVIRONMENT VARIABLES ---
if (!TOKEN || !VOICE_CHANNEL_ID || !TEXT_CHANNEL_ID || !process.env.START_DATE) {
    console.error("[VALIDASI] Eror: Konfigurasi di berkas .env belum lengkap!");
    process.exit(1);
}

const start = DateTime.fromISO(process.env.START_DATE, { zone: TIMEZONE });
if (!start.isValid) {
    console.error("[VALIDASI] Eror: Format START_DATE di .env salah (Harus YYYY-MM-DD)!");
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

// --- FUNGSI PENJAGA VOICE CHANNEL 24/7 ---
const connectToVoice = async () => {
    if (isConnecting) return; 
    isConnecting = true;

    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error(`[GUARD] Gagal: Voice Channel ID tidak ditemukan di server atau bot tidak punya akses membaca channel.`);
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

        console.log(`[GUARD] Mencoba mengamankan Voice Channel: ${channel.name}...`);

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id, 
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: process.env.SELF_DEAF === "true",
            selfMute: process.env.SELF_MUTE === "true",
        });

        connection.once(VoiceConnectionStatus.Ready, () => {
            console.log(`[GUARD] Bot sukses terhubung di VC ${channel.name}!`);
            isConnecting = false;
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log(`[GUARD] Deteksi Terputus! Mencoba masuk kembali dalam 5 detik...`);
            connection.destroy();
            isConnecting = false;
            setTimeout(connectToVoice, 5000);
        });

        connection.on('error', error => {
            console.error(`[ERROR] Masalah pada jaringan suara Discord: ${error.message}`);
            isConnecting = false;
        });

    } catch (e) {
        console.error(`[ERROR] Gagal total saat mencoba masuk Voice: ${e.message}`);
        isConnecting = false;
        setTimeout(connectToVoice, 10_000);
    }
};

// --- DETEKTOR ANTI-KICK & ANTI-MOVE ---
client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.member.id === client.user.id) {
        if (!newState.channelId) {
            console.log(`[ANTI-KICK] Seseorang telah memutus bot dari VC! Meluncur kembali...`);
            connectToVoice();
        } 
        else if (newState.channelId !== VOICE_CHANNEL_ID) {
            console.log(`[ANTI-MOVE] Bot dipindahkan! Memaksa kembali ke saluran utama...`);
            connectToVoice();
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
    
    // Heartbeat 15 menit
    setInterval(async () => {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
        if (channel && channel.guild) {
            const connection = getVoiceConnection(channel.guild.id); 
            if (!connection || connection.state.status === VoiceConnectionStatus.Disconnected) {
                console.log(`[HEARTBEAT] Deteksi koneksi kosong/mati suri, memicu re-connect...`);
                connectToVoice();
            }
        }
    }, 15 * 60 * 1000);
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