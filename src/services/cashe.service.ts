// Organizatsiyalarni 5 daqiqaga keshlash
let orgCache: any[] | null = null;
let orgCacheTime = 0;
const ORG_CACHE_TTL = 5 * 60 * 1000;

export async function getCachedOrganizations(prisma: any) {
  const now = Date.now();
  if (orgCache && now - orgCacheTime < ORG_CACHE_TTL) {
    return orgCache;
  }
  orgCache = await prisma.organization.findMany({
    where: { active: true },
    select: {
      id: true,
      kategoriya: true,
      nomi: true,
      masulShaxs: true,
      lavozimi: true,
      telegramId: true,
      keywords: true,
    },
  });
  orgCacheTime = now;
  return orgCache;
}

// AI natijalarini 1 soatga keshlash (oddiy Map)
const aiCache = new Map<string, any>();

export function getCachedAiResult(text: string) {
  const key = text.length > 200 ? text.slice(0, 200) : text;
  return aiCache.get(key);
}

export function setCachedAiResult(text: string, result: any) {
  const key = text.length > 200 ? text.slice(0, 200) : text;
  aiCache.set(key, result);
  setTimeout(() => aiCache.delete(key), 3600 * 1000); // 1 soat
}
