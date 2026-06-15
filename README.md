# 🦀 Si Krab Nganggur Bot (Discord AFK & Auto-Meme Bot)

[![Railway Deploy](https://img.shields.io/badge/Railway-Deployed-indigo?style=for-the-badge&logo=railway)](https://railway.app/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue?style=for-the-badge&logo=discord)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)

**Si Krab Nganggur Bot** adalah bot Discord personal berbasis Node.js yang didesain khusus untuk mengamankan jam durasi *Voice Channel* secara nonstop (24/7) di server Discord, sekaligus menghitung hari kelulusan/pengangguran secara otomatis menggunakan media meme dinamis. 

Bot ini dideploy secara mandiri di server awan (Cloud) Railway menggunakan sistem kontrol kontainer Nixpacks agar dapat berjalan abadi tanpa memakan daya laptop lokal.

---

## 🎯 Kegunaan Utama (Features)

* **⚡ 24/7 Voice Channel Guard:** Bot akan otomatis masuk ke Voice Channel yang ditentukan saat dinyalakan dan menetap di sana selamanya untuk menjaga statistik durasi keaktifan server.
* **🛡️ Anti-Kick & Anti-Move Protection:** Jika ada *user* atau bot manajemen lain (seperti Voice Master) yang memindahkan atau menendang bot ini keluar dari saluran utama, bot akan otomatis melakukan rekoneksi instan dalam hitungan detik.
* **🔇 Silent & Self-Deafened Mode:** Bot masuk ke saluran suara dalam kondisi membisu (*self-mute*) dan tuli (*self-deaf*) sehingga tidak akan mengganggu privasi atau memakan bandwitdh suara server.
* **📅 Automated Daily Meme Generator (Cron Job):** Menggunakan pustaka grafis `canvas`, bot akan otomatis mengedit templat gambar Mr. Krab secara dinamis dan mengirimkan meme bertuliskan update hitungan hari (`DAY 1`, `DAY 2`, dst.) setiap pukul **03:00 WIB Subuh**.
* **🔄 On-Demand Manual Check:** Menyediakan fitur interaktif perintah teks `!ceknganggur` bagi member server yang ingin memicu pengetesan pembuatan gambar meme secara instan.

---

## 🛠️ Teknologi & Pustaka yang Digunakan

* **Runtime:** Node.js (v20)
* **Library Utama:** `discord.js` (v14) & `@discordjs/voice` (untuk koneksi suara)
* **Gambar & Grafis:** `canvas` (Pustaka native pengetikan teks di atas gambar)
* **Penjadwal:** `node-cron` (Untuk pemicu otomatis jam 3 subuh)
* **Zona Waktu:** `luxon` (Memastikan sinkronisasi Waktu Indonesia Barat / Asia Jakarta)
* **Deployment Engine:** Nixpacks (Untuk penyediaan dependensi grafis Linux `cairo` & `pango` di Railway)

---

## ⚙️ Variabel Lingkungan (Environment Variables)

Untuk menjalankan bot ini dengan aman tanpa membocorkan data rahasia ke publik, konfigurasi wajib dimasukkan melalui panel *Environment Variables* di platform hosting:

| Nama Variabel | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- |
| `TOKEN` | Token rahasia aplikasi bot dari Discord Developer Portal | `MTUxMzY5...` |
| `CHANNEL_ID` | ID unik dari Voice Channel target tempat bot berjaga | `1515933402270924820` |
| `TEXT_CHANNEL_ID` | ID unik Text Channel tempat bot mengirimkan meme otomatis | `1515933402270924820` |
| `START_DATE` | Tanggal patokan dimulainya hitungan hari (YYYY-MM-DD) | `2026-06-15` |
| `CRON` | Jadwal eksekusi otomatis subuh (Format ekspresi cron) | `0 3 * * *` |
| `TZ` | Pengaturan zona waktu wilayah server | `Asia/Jakarta` |
| `SELF_MUTE` | Status membisu bot saat berada di saluran suara | `true` |
| `SELF_DEAF` | Status menulikan bot saat berada di saluran suara | `true` |

---

## 🚀 Cara Memakai & Menjalankan Bot

### 1. Persiapan Awal di Discord Developer Portal
1. Buat aplikasi baru di [Discord Developer Portal](https://discord.com/developers/applications).
2. Masuk ke tab **Bot**, lalu aktifkan bagian **Privileged Gateway Intents** (`Presence`, `Server Members`, dan `Message Content`).
3. Salin token bot Anda dan masukkan ke konfigurasi hosting.
4. Undang bot ke server Anda menggunakan menu **OAuth2 URL Generator** dengan mencentang ruang lingkup `bot` dan izin `Connect`, `Speak`, `Send Messages`, dan `View Channels`.

### 2. Cara Menjalankan Secara Lokal (Development)
Jika Anda ingin mencoba menjalankannya di komputer lokal menggunakan VS Code:
1. Gandakan repositori ini atau unduh berkasnya.
2. Buat sebuah berkas bernama `.env` di folder utama dan isi dengan daftar variabel di atas.
3. Buka terminal di VS Code, lalu instal dependensi paket:
   ```bash
   npm install
4. Jalankan bot menggunakan perintah:
   ```bash
   npm start

### 3. Cara Deployment ke Awan (Railway)
1. Unggah seluruh kode proyek ini ke repositori personal GitHub Anda (pastikan file .env sudah terdaftar di .gitignore).
2. Masuk ke dasbor Railway.app dan buat proyek baru via opsi Deploy from GitHub repo.
3. Masuk ke tab Variables di Railway, lalu klik Raw Editor dan masukkan seluruh daftar konfigurasi variabel lingkungan Anda tanpa tanda petik.
4. Railway akan membaca berkas nixpacks.toml secara otomatis untuk merakit dependensi grafis Linux, dan bot Anda akan langsung aktif 24/7 secara otomatis!

💬 Perintah Teks (Commands)
!ceknganggur – Meminta bot untuk secara instan membuat dan mengirimkan cuplikan meme Mr. Krab sesuai jumlah hari yang telah berjalan sejak tanggal START_DATE.
