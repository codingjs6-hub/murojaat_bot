import { Bot, InlineKeyboard, InputFile } from "grammy";
import dotenv from "dotenv";
import fs from "fs/promises";

import { prisma } from "./db/prisma.js";
import {
  getUzbekistanDateString,
  formatAppealNumber,
} from "./utils/appeal-number.js";
import { extractPhone } from "./utils/phone.js";
import { classifyWithTimeout } from "./services/ai.service.js";
import { generateAppealPdf } from "./services/pdf.service.js";
import {
  downloadTelegramFile,
  downloadMultipleTelegramFiles,
  cleanupFiles,
} from "./services/file.service.js";
import {
  getCachedOrganizations,
  getCachedAiResult,
  setCachedAiResult,
} from "./services/cashe.service.js";
import type { Session, AiResult } from "./types.js";

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN topilmadi");

const bot = new Bot(token);
const sessions = new Map<number, Session>();

// ========== YANGI: Dalolatnoma kutilayotgan foydalanuvchilar ==========
const awaitingProof = new Map<
  number,
  { appealId: number; appealNumber: string; userId: number }
>();

// ========== XATOLARNI TUTISH ==========
bot.catch((err) => {
  console.error("❌ BOT ERROR:", err);
});

// -----test-----

const TEST_MODE = process.env.TEST_MODE === "true";
const TEST_LEADER_ID = process.env.TEST_LEADER_ID
  ? Number(process.env.TEST_LEADER_ID)
  : null;
const TEST_ADMIN_ID = process.env.TEST_ADMIN_ID
  ? Number(process.env.TEST_ADMIN_ID)
  : null;

// -----test-----

const COLLECT_TIME = Number(process.env.COLLECT_SECONDS || 120) * 1000;
const ALLOWED_GROUP_ID = Number(process.env.ALLOWED_GROUP_ID);

const FALLBACK_LEADER_ID = 6179892207;
// process.env.FALLBACK_LEADER_ID
//   ? Number(process.env.FALLBACK_LEADER_ID)
//   : null;

const BACKUP_CHAT_ID = 6179892207;
// process.env.BACKUP_CHAT_ID
//   ? Number(process.env.BACKUP_CHAT_ID)
//   : null;

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || "")
  .split(",")
  .map((id) => Number(id.trim()))
  .filter(Boolean);

const IGNORED_USERS = (process.env.IGNORE_USER_IDS || "")
  .split(",")
  .map((id) => Number(id.trim()))
  .filter(Boolean);

const AI_TIMEOUT_SECONDS = Number(process.env.AI_TIMEOUT_SECONDS || 15);

const MAX_MESSAGES_PER_MINUTE = 15;
const MAX_TEXTS = 10;
const MAX_PHOTOS = 10;
const MAX_VIDEOS = 3;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_PROOF_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const userRate = new Map<number, { count: number; startedAt: number }>();

function makeSessionId(userId: number) {
  return `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAllowedGroup(chatId: number) {
  return Boolean(ALLOWED_GROUP_ID && chatId === ALLOWED_GROUP_ID);
}

function isIgnoredUser(userId: number) {
  return IGNORED_USERS.includes(userId);
}

function checkRateLimit(userId: number) {
  const now = Date.now();
  const current = userRate.get(userId);

  if (!current || now - current.startedAt > 60_000) {
    userRate.set(userId, { count: 1, startedAt: now });
    return true;
  }

  current.count += 1;
  return current.count <= MAX_MESSAGES_PER_MINUTE;
}

function appealKeyboard(sessionId: string) {
  return new InlineKeyboard()
    .text("✅ Yuborish", `submit:${sessionId}`)
    .text("❌ Bekor qilish", `cancel:${sessionId}`);
}

function resetTimer(userId: number, session: Session) {
  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    startFinalize(userId, session.sessionId, "auto");
  }, COLLECT_TIME);
}

function createSessionBase(ctx: any, timer: NodeJS.Timeout, sessionId: string) {
  return {
    sessionId,
    status: "collecting" as const,
    userId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    chatId: ctx.chat.id,
    location: null,
    phone: null,
    timer,
    closed: false,
  };
}

function buildAiInput(session: Session) {
  const text = session.messages.join("\n").trim();
  if (text) return text;

  const parts: string[] = [];
  if (session.photos.length > 0) {
    parts.push(
      `Fuqaro ${session.photos.length} ta rasm yuborgan, lekin matn yozmagan.`
    );
  }
  if (session.videos.length > 0) {
    parts.push(
      `Fuqaro ${session.videos.length} ta video yuborgan, lekin matn yozmagan.`
    );
  }
  if (session.location) {
    parts.push("Fuqaro lokatsiya yuborgan, lekin matn yozmagan.");
  }
  return parts.length ? parts.join("\n") : "Fuqaro murojaat yuborgan.";
}

async function notifyAdmins(text: string) {
  for (const adminId of ADMIN_IDS) {
    try {
      await bot.api.sendMessage(adminId, text);
    } catch {}
  }
}

async function handleNonAppealBeforeSession(ctx: any, text: string) {
  try {
    const cached = getCachedAiResult(text);
    if (cached) {
      if (cached.turi === "THANKS") {
        await ctx.reply(" Bildirgan minnatdorchiligingiz uchun raxmat.");
        return true;
      }
      if (cached.turi === "STATUS") {
        await ctx.reply("ℹ️ Murojaatingiz nazoratga olingan.");
        return true;
      }
      if (cached.turi === "OTHER") return true;
      return false;
    }

    const activeOrganizations = await getCachedOrganizations(prisma);

    if (!activeOrganizations) {
      console.error("Tashkilotlar topilmadi!");
      return;
    }

    const ai = await classifyWithTimeout(
      text,
      activeOrganizations,
      AI_TIMEOUT_SECONDS * 1000
    );
    setCachedAiResult(text, ai);

    if (ai.turi === "THANKS") {
      await ctx.reply(" Bildirgan minnatdorchiligingiz uchun raxmat!");
      return true;
    }
    if (ai.turi === "STATUS") {
      await ctx.reply("ℹ️ Murojaatingiz ko‘rib chiqilmoqda.");
      return true;
    }
    if (ai.turi === "OTHER") return true;
    return false;
  } catch (error) {
    console.error("❌ PRE AI CHECK ERROR:", error);
    return false;
  }
}

async function startFinalize(
  userId: number,
  sessionId: string,
  source: "button" | "auto"
) {
  const session = sessions.get(userId);
  if (!session) return;
  if (session.sessionId !== sessionId) return;
  if (session.status !== "collecting") return;

  session.status = "processing";
  session.closed = true;
  clearTimeout(session.timer);

  console.log(
    `🚀 FINALIZE START: user=${userId}, session=${sessionId}, source=${source}`
  );
  await finalizeAppeal(session);
}

// ========== COMMANDS ==========
bot.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  if (!ctx.from) return;

  const userId = BigInt(ctx.from.id);
  const isAdmin = ADMIN_IDS.includes(ctx.from.id);

  try {
    await prisma.user.upsert({
      where: { telegramId: userId },
      update: {
        username: ctx.from.username,
        ism: ctx.from.first_name,
        familiya: ctx.from.last_name,
        botStarted: true,
        isAdmin: isAdmin,
      },
      create: {
        telegramId: userId,
        username: ctx.from.username,
        ism: ctx.from.first_name,
        familiya: ctx.from.last_name,
        botStarted: true,
        isAdmin: isAdmin,
      },
    });

    if (isAdmin) {
      const adminPanelUrl = process.env.ADMIN_SITE;
      if (adminPanelUrl) {
        const keyboard = {
          keyboard: [
            [{ text: "📊 Dashboard", web_app: { url: adminPanelUrl } }],
          ],
          resize_keyboard: true,
        };
        await ctx.reply(
          "✅ Bot muvaffaqiyatli ulandi. Admin panelga o‘tish uchun quyidagi tugmani bosing:",
          { reply_markup: keyboard }
        );
      } else {
        await ctx.reply("✅ Bot muvaffaqiyatli ulandi.");
      }
    } else {
      await ctx.reply(
        "✅ Bot muvaffaqiyatli ulandi.\n\nEndi sizga murojaatlar yuborilishi mumkin."
      );
    }
  } catch (error) {
    console.error("❌ START ERROR:", error);
    await ctx.reply("Xatolik yuz berdi. Iltimos, keyinroq qayta urining.");
  }
});

// ========== MESSAGE HANDLERS ==========

// ========== YANGI: Dalolatnoma faylini qabul qilish (shaxsiy chat) ==========
bot.on(":file", async (ctx) => {
  // Faqat shaxsiy chatda ishlaydi
  if (ctx.chat.type !== "private") return;
  if (!ctx.from) return;
  if (!ctx.message) return;

  const userId = ctx.from.id;
  const proofRequest = awaitingProof.get(userId);
  if (!proofRequest) return;

  let fileId: string | undefined;
  let fileType: string = "unknown";
  let fileName: string = "dalolatnoma";
  let fileSize: number = 0;

  // 1. Fayl turini aniqlash
  if (ctx.message.photo) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    fileId = photo.file_id;
    fileType = "rasm";
    fileSize = photo.file_size || 0;
    fileName = `${proofRequest.appealNumber}_dalolatnoma.jpg`;
  } else if (ctx.message.document) {
    const doc = ctx.message.document;
    fileId = doc.file_id;
    fileSize = doc.file_size || 0;
    fileName = doc.file_name || `${proofRequest.appealNumber}_dalolatnoma.pdf`;
    const mimeType = doc.mime_type || "";

    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      await ctx.reply(
        "❌ **Noto‘g‘ri fayl turi!**\n\n" +
          "Faqat **rasm (JPG, PNG), PDF, Word, Excel** fayllari qabul qilinadi."
      );
      awaitingProof.delete(userId);
      return;
    }

    if (mimeType.includes("pdf")) fileType = "PDF";
    else if (mimeType.includes("word")) fileType = "Word";
    else if (mimeType.includes("excel") || mimeType.includes("sheet"))
      fileType = "Excel";
    else fileType = "rasm";
  } else {
    await ctx.reply("❌ Iltimos, rasm yoki hujjat (PDF, Word, Excel) yuklang.");
    awaitingProof.delete(userId);
    return;
  }

  if (!fileId) {
    await ctx.reply("❌ Fayl topilmadi. Iltimos, qayta urining.");
    awaitingProof.delete(userId);
    return;
  }

  // 2. Fayl hajmini tekshirish
  const MAX_PROOF_FILE_SIZE = 20 * 1024 * 1024;
  if (fileSize > MAX_PROOF_FILE_SIZE) {
    await ctx.reply(
      `❌ **Fayl juda katta!**\n\n` +
        `Ruxsat etilgan maksimal hajm: **${
          MAX_PROOF_FILE_SIZE / 1024 / 1024
        } MB**\n` +
        `Siz yuborgan fayl: **${Math.round(fileSize / 1024 / 1024)} MB**`
    );
    awaitingProof.delete(userId);
    return;
  }

  try {
    // 3. Murojaat statusini RESOLVED qilish
    const now = new Date();
    await prisma.appeal.update({
      where: { id: proofRequest.appealId },
      data: { status: "RESOLVED", resolvedAt: now },
    });

    // 4. Admin'ga dalolatnoma yuborish (InputFile.fromFileId ishlatiladi!)
    let adminId = 6179892207;

    if (adminId) {
      const captionText =
        `📄 **Dalolatnoma**\n\n` +
        `📌 **Murojaat raqami:** ${proofRequest.appealNumber}\n` +
        `👤 **Mas’ul xodim:** ${ctx.from.first_name || "Noma’lum"}${
          ctx.from.username ? ` (@${ctx.from.username})` : ""
        }\n` +
        `📁 **Fayl turi:** ${fileType}\n` +
        `🕒 **Hal qilindi:** ${now.toLocaleString("uz-UZ")}\n\n` +
        `✅ Murojaat tegishli tartibda hal qilindi va dalolatnoma ilova qilindi.`;

      // ✅ Muhim: InputFile.fromFileId() ishlatiladi!
      await bot.api.sendDocument(adminId, {
        document: InputFile.fromFileId(fileId),
        caption: captionText,
        parse_mode: "Markdown",
      });
    }

    // 5. Xodimga tasdiqlov xabari
    await ctx.reply(
      `✅ **Murojaat ${proofRequest.appealNumber} hal qilindi!**\n\n` +
        `📎 Dalolatnoma qabul qilindi va adminga yuborildi.\n` +
        `🕒 Vaqt: ${now.toLocaleString("uz-UZ")}`
    );

    // 6. Holatni tozalash
    awaitingProof.delete(userId);
  } catch (error) {
    console.error("❌ DALOLATNOMA QAYTA ISHLASH XATOSI:", error);
    await ctx.reply("❌ Xatolik yuz berdi. Iltimos, qayta urining.");
    awaitingProof.delete(userId); // ✅ xatolikda ham tozalanadi
  }
});

// ========== Eski MESSAGE HANDLERS (guruh uchun) ==========
bot.on("my_chat_member", async (ctx) => {
  const chat = ctx.chat;
  if (chat.type === "group" || chat.type === "supergroup") {
    if (!isAllowedGroup(chat.id)) {
      try {
        await bot.api.leaveChat(chat.id);
      } catch {}
      await notifyAdmins(
        `⚠️ Bot begona guruhga qo‘shildi: ${chat.title || "Noma’lum"}`
      );
    }
  }
});

bot.on("message:text", async (ctx) => {
  if (!isAllowedGroup(ctx.chat.id)) return;
  if (isIgnoredUser(ctx.from.id)) return;
  if (!checkRateLimit(ctx.from.id)) return;

  const userId = ctx.from.id;
  const text = ctx.message.text;
  const foundPhone = extractPhone(text);

  const existing = sessions.get(userId);
  if (existing && existing.status === "processing") return;

  if (existing && existing.status === "collecting") {
    if (existing.messages.length >= MAX_TEXTS) return;
    existing.messages.push(text);
    if (foundPhone) existing.phone = foundPhone;
    resetTimer(userId, existing);
    return;
  }

  const handledWithoutSession = await handleNonAppealBeforeSession(ctx, text);
  if (handledWithoutSession) return;

  const sessionId = makeSessionId(userId);
  const timer = setTimeout(() => {
    startFinalize(userId, sessionId, "auto");
  }, COLLECT_TIME);

  sessions.set(userId, {
    ...createSessionBase(ctx, timer, sessionId),
    messages: [text],
    photos: [],
    videos: [],
    phone: foundPhone,
  });

  await ctx.reply(
    `✅ Xabaringiz qabul qilindi.\n\nQo‘shimcha rasm, video yoki lokatsiya yuborishingiz mumkin.\n\nTayyor bo‘lsa “✅ Yuborish” tugmasini bosing.`,
    { reply_markup: appealKeyboard(sessionId) }
  );
});

bot.on("message:photo", async (ctx) => {
  if (!isAllowedGroup(ctx.chat.id)) return;
  if (isIgnoredUser(ctx.from.id)) return;
  if (!checkRateLimit(ctx.from.id)) return;

  const userId = ctx.from.id;
  const bestPhoto = ctx.message.photo[ctx.message.photo.length - 1];
  if (!bestPhoto) return;

  const caption = ctx.message.caption?.trim();
  const captionPhone = caption ? extractPhone(caption) : null;

  const existing = sessions.get(userId);
  if (existing && existing.status === "processing") return;

  if (existing && existing.status === "collecting") {
    if (existing.photos.length >= MAX_PHOTOS) return;
    existing.photos.push({
      fileId: bestPhoto.file_id,
      fileUniqueId: bestPhoto.file_unique_id,
    });
    if (caption) existing.messages.push(caption);
    if (captionPhone) existing.phone = captionPhone;
    resetTimer(userId, existing);
    return;
  }

  if (caption) {
    const handled = await handleNonAppealBeforeSession(ctx, caption);
    if (handled) return;
  }

  const sessionId = makeSessionId(userId);
  const timer = setTimeout(() => {
    startFinalize(userId, sessionId, "auto");
  }, COLLECT_TIME);

  sessions.set(userId, {
    ...createSessionBase(ctx, timer, sessionId),
    messages: caption ? [caption] : [],
    photos: [
      { fileId: bestPhoto.file_id, fileUniqueId: bestPhoto.file_unique_id },
    ],
    videos: [],
    phone: captionPhone,
  });

  await ctx.reply(
    `✅ Rasmingiz qabul qilindi.\n\nTayyor bo‘lsa “✅ Yuborish” tugmasini bosing.`,
    {
      reply_markup: appealKeyboard(sessionId),
    }
  );
});

bot.on("message:video", async (ctx) => {
  if (!isAllowedGroup(ctx.chat.id)) return;
  if (isIgnoredUser(ctx.from.id)) return;
  if (!checkRateLimit(ctx.from.id)) return;

  const userId = ctx.from.id;
  const video = ctx.message.video;
  const caption = ctx.message.caption?.trim();
  const captionPhone = caption ? extractPhone(caption) : null;

  if (video.file_size && video.file_size > MAX_VIDEO_SIZE) return;

  const existing = sessions.get(userId);
  if (existing && existing.status === "processing") return;

  if (existing && existing.status === "collecting") {
    if (existing.videos.length >= MAX_VIDEOS) return;
    existing.videos.push({ fileId: video.file_id });
    if (caption) existing.messages.push(caption);
    if (captionPhone) existing.phone = captionPhone;
    resetTimer(userId, existing);
    return;
  }

  if (caption) {
    const handled = await handleNonAppealBeforeSession(ctx, caption);
    if (handled) return;
  }

  const sessionId = makeSessionId(userId);
  const timer = setTimeout(() => {
    startFinalize(userId, sessionId, "auto");
  }, COLLECT_TIME);

  sessions.set(userId, {
    ...createSessionBase(ctx, timer, sessionId),
    messages: caption ? [caption] : [],
    photos: [],
    videos: [{ fileId: video.file_id }],
    phone: captionPhone,
  });

  await ctx.reply(
    `✅ Videongiz qabul qilindi.\n\nTayyor bo‘lsa “✅ Yuborish” tugmasini bosing.`,
    {
      reply_markup: appealKeyboard(sessionId),
    }
  );
});

bot.on("message:location", async (ctx) => {
  if (!isAllowedGroup(ctx.chat.id)) return;
  if (isIgnoredUser(ctx.from.id)) return;
  if (!checkRateLimit(ctx.from.id)) return;

  const userId = ctx.from.id;
  const location = ctx.message.location;

  const existing = sessions.get(userId);
  if (existing && existing.status === "processing") return;

  if (existing && existing.status === "collecting") {
    existing.location = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    resetTimer(userId, existing);
    return;
  }

  const sessionId = makeSessionId(userId);
  const timer = setTimeout(() => {
    startFinalize(userId, sessionId, "auto");
  }, COLLECT_TIME);

  sessions.set(userId, {
    ...createSessionBase(ctx, timer, sessionId),
    messages: [],
    photos: [],
    videos: [],
    location: { latitude: location.latitude, longitude: location.longitude },
  });

  await ctx.reply(
    `✅ Lokatsiya qabul qilindi.\n\nMuammo haqida matn yozishingiz mumkin.`,
    {
      reply_markup: appealKeyboard(sessionId),
    }
  );
});

bot.on("message:document", async (ctx) => {
  if (isAllowedGroup(ctx.chat.id)) await ctx.reply("❌ Fayl qabul qilinmaydi.");
});
bot.on("message:voice", async (ctx) => {
  if (isAllowedGroup(ctx.chat.id))
    await ctx.reply("❌ Ovozli xabar qabul qilinmaydi.");
});

// ========== CALLBACK QUERIES ==========
bot.callbackQuery(/^submit:(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const sessionId = ctx.match[1];
  const session = sessions.get(userId);

  if (!session || session.sessionId !== sessionId) {
    await ctx
      .answerCallbackQuery("Murojaat seansi topilmadi yoki eskirgan.")
      .catch((e) => {
        console.warn("Callback answer failed (session not found):", e.message);
      });
    return;
  }
  if (session.status === "processing") {
    await ctx
      .answerCallbackQuery("⏳ Murojaat yuborilmoqda...")
      .catch(() => {});
    return;
  }

  await ctx.answerCallbackQuery("⏳ Murojaat yuborilmoqda...").catch(() => {});
  await startFinalize(userId, sessionId, "button");
});

bot.callbackQuery(/^cancel:(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const sessionId = ctx.match[1];
  const session = sessions.get(userId);

  if (!session || session.sessionId !== sessionId) return;

  clearTimeout(session.timer);
  sessions.delete(userId);
  await ctx.answerCallbackQuery("❌ Murojaat bekor qilindi").catch(() => {});
  try {
    await ctx.editMessageText("❌ Murojaatingiz bekor qilindi.");
  } catch {}
});

// ========== YANGI: HAL QILINDI TUGMASI (dalolatnoma talab qiladi) ==========
// ========== HAL QILINDI TUGMASI (dalolatnoma talab qiladi) ==========
bot.callbackQuery(/^resolve:(\d+)$/, async (ctx) => {
  const appealId = Number(ctx.match[1]);
  const userId = ctx.from.id;

  try {
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      await ctx.answerCallbackQuery("Murojaat topilmadi.").catch(() => {});
      return;
    }
    if (appeal.status === "RESOLVED") {
      await ctx.answerCallbackQuery("Allaqachon hal qilingan!").catch(() => {});
      return;
    }

    // 1. Eski caption matnini saqlab qolamiz (HTML formatda)
    const oldCaption = ctx.callbackQuery.message?.caption || "";

    // 2. Xabarni tahrirlash – faqat tugmani olib tashlaymiz, matnni o‘zgartirmaymiz
    await ctx.editMessageCaption({
      caption: oldCaption,
      parse_mode: "HTML", // asl xabar HTML formatda yuborilgan bo‘lsa
      reply_markup: undefined, // tugmani olib tashlash
    });

    // 3. Holatni saqlash (status hali o‘zgarmaydi)
    awaitingProof.set(userId, {
      appealId,
      appealNumber: appeal.murojaatRaqami,
      userId,
    });

    // 4. Foydalanuvchiga dalolatnoma so‘rovchi yangi xabar yuboramiz
    await ctx.reply(
      `📎 **Dalolatnoma faylini yuklang**\n\n` +
        `Murojaat raqami: **${appeal.murojaatRaqami}**\n\n` +
        `**Qabul qilinadigan fayl turlari:**\n` +
        `• Rasm (JPG, PNG)\n` +
        `• PDF\n` +
        `• Word (DOC, DOCX)\n` +
        `• Excel (XLS, XLSX)\n\n` +
        `Maksimal hajm: 20 MB\n\n` +
        `Fayl yuklaganingizdan so‘ng murojaat hal qilingan deb belgilanadi.`,
      { parse_mode: "Markdown" }
    );

    await ctx
      .answerCallbackQuery("Iltimos, dalolatnoma faylini yuklang.")
      .catch(() => {});
  } catch (error) {
    console.error("❌ RESOLVE ERROR:", error);
    await ctx.answerCallbackQuery("Xatolik yuz berdi.").catch(() => {});
  }
});
// ========== ASOSIY FINALIZE APPEAL FUNKSIYASI (O‘ZGARMAGAN) ==========
async function finalizeAppeal(session: Session) {
  const tempFiles: string[] = [];
  const userId = session.userId;

  try {
    const fullText = session.messages.join("\n").trim();
    const phone = session.phone || extractPhone(fullText);

    const activeOrganizations = (await getCachedOrganizations(prisma)) ?? [];
    const aiInput = buildAiInput(session);

    const ai = await classifyWithTimeout(
      aiInput,
      activeOrganizations,
      AI_TIMEOUT_SECONDS * 1000
    );

    if (["THANKS", "STATUS", "OTHER"].includes(ai.turi)) {
      if (ai.turi === "THANKS")
        await bot.api.sendMessage(
          session.chatId,
          " Bildirgan minnatdorchiligingiz uchun rahmat!"
        );
      if (ai.turi === "STATUS")
        await bot.api.sendMessage(
          session.chatId,
          "ℹ️ Murojaatingiz ko‘rib chiqish jarayonida."
        );
      session.status = "done";
      return;
    }

    let adminOrganization = await prisma.organization.findFirst({
      where: { kategoriya: "admin", active: true },
    });
    if (!adminOrganization) {
      adminOrganization = await prisma.organization.create({
        data: {
          nomi: "Admin nazorati",
          masulShaxs: "Super Admin",
          lavozimi: "Tizim administratori",
          kategoriya: "admin",
          active: true,
        },
      });
    }

    let organization = adminOrganization;
    let targetTelegramId: number | null = FALLBACK_LEADER_ID;

    // -----test-----
    if (TEST_MODE && TEST_LEADER_ID) {
      targetTelegramId = TEST_LEADER_ID;
      console.log(
        `🧪 TEST MODE: Murojaat test rahbariga (${TEST_LEADER_ID}) yuborilmoqda`
      );
    }
    // -----test-----

    const foundOrg = await prisma.organization.findFirst({
      where: { kategoriya: ai.kategoriya, active: true },
    });

    if (foundOrg && foundOrg.telegramId && ai.kategoriya !== "admin") {
      organization = foundOrg;
      targetTelegramId = 6179892207;
      // Number(foundOrg.telegramId);
    } else if (foundOrg && ai.kategoriya !== "admin") {
      organization = foundOrg;
      targetTelegramId = FALLBACK_LEADER_ID;
    }

    console.log(
      `📌 Murojaat: kategoriya=${ai.kategoriya}, tashkilot=${organization.nomi}, targetId=${targetTelegramId}`
    );

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(session.userId) },
      update: {
        username: session.username,
        ism: session.firstName,
        familiya: session.lastName,
        phone: phone || undefined,
      },
      create: {
        telegramId: BigInt(session.userId),
        username: session.username,
        ism: session.firstName,
        familiya: session.lastName,
        phone: phone || undefined,
      },
    });

    const dateString = getUzbekistanDateString();
    const todayCount = await prisma.appeal.count({
      where: { murojaatRaqami: { startsWith: `SHF-${dateString}-` } },
    });
    const appealNumber = formatAppealNumber(dateString, todayCount + 1);

    const DEADLINE_DAYS = 5;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + DEADLINE_DAYS);

    const appeal = await prisma.appeal.create({
      data: {
        murojaatRaqami: appealNumber,
        userId: user.id,
        chatId: BigInt(session.chatId),
        xomMatn: fullText,
        phone,
        status: "IN_PROGRESS",
        deadline: deadlineDate,
        kategoriya: ai.kategoriya,
        aiXulosa: ai.xulosa,
        tashkilot: organization?.nomi || ai.tashkilot || "Admin nazorati",
        organizationId: organization?.id,
      },
    });

    const photoPaths = await downloadMultipleTelegramFiles(
      bot,
      session.photos,
      appealNumber
    );
    tempFiles.push(...photoPaths);

    const locationText = session.location
      ? `\n\nLokatsiya: https://maps.google.com/?q=${session.location.latitude},${session.location.longitude}`
      : "";
    const originalText = fullText || "Fuqaro matn yozmagan.";

    const pdfPath = await generateAppealPdf({
      appealNumber,
      citizenName: `${session.firstName || ""} ${
        session.lastName || ""
      }`.trim(),
      username: session.username,
      phone,
      organization: organization?.nomi || ai.tashkilot || "Admin nazorati",
      aiSummary: ai.xulosa,
      originalText: originalText + locationText,
      photoPaths,
    });
    tempFiles.push(pdfPath);

    const caption =
      `Assalomu alaykum hurmatli ${
        organization?.masulShaxs || "Mas’ul xodim"
      }.\n\n` +
      `Sizga yangi murojaat biriktirildi.\n\n` +
      `📌 Murojaat raqami: ${appealNumber}\n` +
      `🏢 Tashkilot: ${organization?.nomi || "Admin nazorati"}\n` +
      `🕒 Ijro muddati: ${deadlineDate.toLocaleDateString("uz-UZ")} gacha\n\n`;
    const safeCaption =
      caption.length > 1000 ? caption.slice(0, 1000) + "..." : caption;

    if (targetTelegramId) {
      const leaderKeyboard = new InlineKeyboard().text(
        "✅ Hal qilindi",
        `resolve:${appeal.id.toString()}`
      );

      const contactText = session.username
        ? `\n💬 Fuqaro bilan bog'lanish: @${session.username}`
        : `\n💬 Fuqaro profili: <a href="tg://user?id=${session.userId}">${
            session.firstName || "Fuqaro"
          }</a>`;

      const fullCaption = safeCaption + contactText;

      const MY_TELEGRAM_ID = 8364396329;

      const recipients = Array.from(
        new Set([Number(targetTelegramId), MY_TELEGRAM_ID])
      );

      for (const chatId of recipients) {
        try {
          await bot.api.sendDocument(chatId, new InputFile(pdfPath), {
            caption: fullCaption,
            parse_mode: "HTML",
            reply_markup: leaderKeyboard,
          });
        } catch (firstError) {
          console.error(
            `❌ ID: ${chatId} ga HTML+Tugma bilan yuborishda xato:`,
            firstError
          );
          try {
            await bot.api.sendDocument(chatId, new InputFile(pdfPath), {
              caption: safeCaption,
              reply_markup: leaderKeyboard,
            });
          } catch (secondError) {
            console.error(
              `❌ ID: ${chatId} ga zaxira ham o'xshmadi, klaviaturasiz ketadi:`,
              secondError
            );
            try {
              await bot.api.sendDocument(chatId, new InputFile(pdfPath), {
                caption: safeCaption,
              });
            } catch {}
          }
        }
      }
    }

    if (BACKUP_CHAT_ID) {
      try {
        await bot.api.sendDocument(BACKUP_CHAT_ID, new InputFile(pdfPath), {
          caption: `🗂 Backup | 📌 ${appealNumber}`,
        });
      } catch {}
    }

    await bot.api.sendMessage(
      session.chatId,
      `✅ Murojaatingiz qabul qilindi va tegishli tashkilotga biriktirildi.\n\n📌 Murojaat raqami: ${appealNumber}\n\nMas’ul idoralar zaruriyat bo'lsa sizga bog'lanishadi!`
    );

    session.status = "done";
  } catch (error) {
    console.error("❌ FINALIZE XATOSI:", error);
    session.status = "done";
  } finally {
    clearTimeout(session.timer);
    if (sessions.get(userId)?.sessionId === session.sessionId)
      sessions.delete(userId);
    await cleanupFiles(tempFiles);
  }
}

bot.start();
console.log("🤖 Bot ishga tushdi");
