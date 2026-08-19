import Groq from "groq-sdk";
import type { AiResult } from "../types.js";

type OrgForAi = {
  kategoriya: string | null;
  nomi: string;
  masulShaxs: string;
  lavozimi: string | null;
  keywords: string | null;
};

const fallback: AiResult = {
  turi: "APPEAL",
  kategoriya: "admin",
  tashkilot: "Admin nazorati",
  xulosa: "AI tahlilida xatolik bo‘ldi. Qo‘lda ko‘rib chiqish kerak.",
};

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function classifyAppeal(
  text: string,
  organizations: OrgForAi[],
  signal?: AbortSignal
): Promise<AiResult> {
  if (!process.env.GROQ_API_KEY) return fallback;

  const orgList = organizations
    .filter((org) => org.kategoriya)
    .map((org) => {
      const kalitSozlar = org.keywords
        ? org.keywords
        : "umumiy soha xizmatlari";
      return `- KATEGORIYA_ID: "${org.kategoriya}" | TASHKILOT NOMI: "${org.nomi}" | SHU SOHAGA OID KALIT SO'ZLAR: [${kalitSozlar}]`;
    })
    .join("\n");

  const finalOrgList =
    orgList ||
    `- KATEGORIYA_ID: "admin" | TASHKILOT NOMI: "Admin nazorati" | KALIT SO'ZLAR: [boshqa]`;

  try {
    const completion = await client.chat.completions.create(
      {
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
Siz Shofirkon tumani hokimligi Telegram guruhidagi murojaatlarni tahlil qiluvchi va ularni mas'ul idoralarga biriktiruvchi professional operatorsiz.
Vazifangiz fuqaro yozgan matn mazmunini tahlil qilib, uni Ma'lumotlar Bazasi (DB) ro'yxatidagi mos keluvchi KATEGORIYA_ID ga 100% aniqlik bilan yo'naltirishdir.

Faqat va faqat JSON formatida javob bering. Markdown, tushuntirish yoki qo'shimcha matn yozish QAT'IYAN TAQIQLANADI.

### MUHIM TOIFALAR (turi):
- APPEAL: Muammo, etiroz, shikoyat, nosozlik, yordam so'rash yoki takliflar.
- THANKS: Rahmatnoma, minnatdorchilik, "muammo ijobiy hal bo'ldi" mazmunidagi xabarlar.
- STATUS: "Murojaatim nima bo'ldi?", "Murojaatim ko'rib chiqildimi?", "Javob bormi?" kabi so'rovlar.
- OTHER: Salom-alik, oddiy suhbatlar, guruh adminlari yozishmalari yoki mavzuga mutlaqo aloqasiz xabarlar.

### RUXSAT ETILGAN KATEGORIYA ID-LARI RO'YXATI:
Siz faqat va faqat quyidagi ro'yxatda mavjud bo'lgan "KATEGORIYA_ID" qiymatlaridan birini tanlashingiz shart:

${finalOrgList}

Agar murojaatda muammo sohasi aniq ko'rsatilmagan bo'lsa yoki yuqoridagi ro'yxatda unga mos keladigan birorta ham tashkilot topilmasa, qat'iy ravishda mana bu ob'ektni qaytaring:
"kategoriya": "admin"
"tashkilot": "Admin nazorati"

### QO'SHIMCHA QOIDALAR:
1. Semantik tahlilga tayaning. Masalan, "tok yo'q" -> "elektr_taminoti".
2. Har bir tashkilotning kalit so'zlariga e'tibor bering (kirill, sheva, xato yozilgan variantlar).
3. Agar matnda faqat "matnsiz rasm/video/lokatsiya" deyilsa -> "admin".
4. Xulosa 10-15 so'zdan oshmasin, faqat muhim ma'lumot.

### JAVOB FORMATI (FAQAT JSON):
{
  "turi": "APPEAL",
  "kategoriya": "tanlangan_kategoriya_id_si",
  "tashkilot": "tanlangan_tashkilot_nomi",
  "xulosa": "Murojaatning qisqa mazmuni (10-15 so'z)"
}
            `.trim(),
          },
          { role: "user", content: text },
        ],
      },
      { signal }
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as AiResult;

    if (!["APPEAL", "THANKS", "STATUS", "OTHER"].includes(parsed.turi)) {
      return fallback;
    }

    const allowedCategories = new Set([
      ...(organizations.map((o) => o.kategoriya).filter(Boolean) as string[]),
      "admin",
    ]);

    const kategoriya = allowedCategories.has(parsed.kategoriya || "")
      ? parsed.kategoriya
      : "admin";

    const tashkilot =
      kategoriya === "admin"
        ? "Admin nazorati"
        : organizations.find((o) => o.kategoriya === kategoriya)?.nomi ||
          parsed.tashkilot;

    return {
      turi: parsed.turi,
      kategoriya: kategoriya as string,
      tashkilot: tashkilot ?? "Admin nazorati",
      xulosa: parsed.xulosa ?? "Qisqa xulosa mavjud emas.",
    };
  } catch (error: any) {
    // Abort (timeout) xatolarini aniqlash – APIUserAbortError yoki AbortError
    const isAbortError =
      error?.name === "AbortError" ||
      error?.name === "APIUserAbortError" ||
      error?.message?.includes("aborted") ||
      error?.constructor?.name === "APIUserAbortError";

    if (isAbortError) {
      console.warn("⏱ AI so‘rovi bekor qilindi (timeout)");
      return fallback;
    }
    console.error("❌ GROQ AI KLASSIFIKATSIYA XATOSI:", error);
    return fallback;
  }
}

export async function classifyWithTimeout(
  text: string,
  organizations: OrgForAi[],
  timeoutMs: number = 15000
): Promise<AiResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await classifyAppeal(text, organizations, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}
