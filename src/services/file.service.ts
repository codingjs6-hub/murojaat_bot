import fs from "fs/promises";
import path from "path";
import type { Bot } from "grammy";

export async function downloadTelegramFile(
  bot: Bot,
  fileId: string,
  appealNumber: string
): Promise<string> {
  const file = await bot.api.getFile(fileId);

  if (!file.file_path) {
    throw new Error("Telegram file_path topilmadi");
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN topilmadi");
  }

  const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  const dir = path.join(process.cwd(), "storage", "photos", appealNumber);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.file_path) || ".jpg";
  const filePath = path.join(dir, `${Date.now()}-${Math.random()}.jpg`);

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error("Telegram file yuklab olinmadi");
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  return filePath;
}

// Bir nechta faylni parallel yuklash
export async function downloadMultipleTelegramFiles(
  bot: Bot,
  photos: { fileId: string }[],
  appealNumber: string
): Promise<string[]> {
  return Promise.all(
    photos.map((photo) => downloadTelegramFile(bot, photo.fileId, appealNumber))
  );
}

// Vaqtinchalik fayllarni parallel o‘chirish
export async function cleanupFiles(paths: string[]) {
  await Promise.all(
    paths.map(async (p) => {
      try {
        await fs.unlink(p);
      } catch (e) {
        console.error("Faylni o‘chirishda xatolik:", p, e);
      }
    })
  );
}
