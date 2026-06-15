import path from "path";
import Canvas, { registerFont } from "canvas";

let memeFont = "sans-serif";

try {
    registerFont(path.resolve(process.cwd(), "assets/fonts/Impact.ttf"), { family: "Impact" });
    memeFont = "Impact";
} catch (error) {
    console.warn("[MEME] Font Impact tidak bisa dipakai, fallback ke font sistem:", error.message);
}

// Fungsi otomatis untuk memotong teks jika terlalu panjang agar tidak keluar dari gambar
const wrapText = (ctx, text, maxWidth) => {
    if (ctx.measureText(text).width < maxWidth) return [text];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    
    while (words.length > 0) {
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) {
            line += `${words.shift()} `;
        } else {
            lines.push(line.trim());
            line = "";
        }
        if (words.length === 0) lines.push(line.trim());
    }
    return lines;
};

const generateMeme = async (imageSrc, topText, bottomText) => {
    const base = await Canvas.loadImage(imageSrc);
    const canvas = Canvas.createCanvas(base.width, base.height);
    const ctx = canvas.getContext("2d");

    // Gambar background asli
    ctx.drawImage(base, 0, 0);

    // Konfigurasi style teks
    const fontSize = Math.round(base.height / 10);
    ctx.font = `bold ${fontSize}px ${memeFont}`;
    ctx.textAlign = "center";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "black";

    // Gambar Teks Atas
    ctx.textBaseline = "top";
    const topLines = wrapText(ctx, topText, base.width - 20);
    if (topLines) {
        topLines.forEach((line, i) => {
            const textHeight = i * fontSize + i * 10 + 10;
            ctx.strokeText(line, base.width / 2, textHeight);
            ctx.fillStyle = "white";
            ctx.fillText(line, base.width / 2, textHeight);
        });
    }

    // Gambar Teks Bawah
    ctx.textBaseline = "bottom";
    const bottomLines = wrapText(ctx, bottomText, base.width - 20);
    if (bottomLines) {
        const initial = base.height - (bottomLines.length - 1) * fontSize - (bottomLines.length - 1) * 10 - 10;
        bottomLines.forEach((line, i) => {
            const textHeight = initial + i * fontSize + i * 10;
            ctx.strokeText(line, base.width / 2, textHeight);
            ctx.fillStyle = "white";
            ctx.fillText(line, base.width / 2, textHeight);
        });
    }
      
    return canvas.toBuffer();
};

export default generateMeme;