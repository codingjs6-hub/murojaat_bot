import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const TEST_TELEGRAM_ID = BigInt("8364396329");

async function main() {
  await prisma.organization.deleteMany();

  await prisma.organization.createMany({
    data: [
      {
        nomi: "Adliya bo‘limi",
        masulShaxs: "Saidov Bekmurod Bozorovich",
        lavozimi: "Boshliq",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "adliya",
        active: true,
        keywords:
          "adliya, qonun, konsultatsiya, DXM, davlat xizmatlari, FXDYo, nikoh, guvohnoma, huquqiy yordam, ariza, meros, pasport, загс, нотариус, нотариал, гувоҳнома, адвокат",
      },
      {
        nomi: "Hokimiyat",
        masulShaxs: "Bahodir Salomov",
        lavozimi: "Hokim 1-o‘rinbosari",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "hokim_1_orinbosari",
        active: true,
        keywords:
          "investitsiya, iqtisodiyot, tuman hokimi, hokimlik, soliq, tadbirkorlik masalalari, tender, loyiha, маблағ, кредит, ҳоким, биринчи ўринбосар",
      },
      {
        nomi: "Hokimiyat (Qurilish)",
        masulShaxs: "Fayzibek Sunnatov",
        lavozimi: "Hokimning qurilish bo‘yicha o‘rinbosari",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "qurilish",
        active: true,
        keywords:
          "qurilish, bino, uy-joy, noqonuniy qurilish, ruxsatnoma, kran, sement, g'isht, arxitektura, qurilish mollari, котлован, ремонт, қурилиш, уй, ремонт",
      },
      {
        nomi: "Hokimiyat (Ijtimoiy)",
        masulShaxs: "Qazoqov Akmal Alijonovich",
        lavozimi: "Hokimning ijtimoiy bo‘yicha o‘rinbosari",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "ijtimoiy",
        active: true,
        keywords:
          "madaniyat, maktab, bog'cha muammosi, oliygoh, sport, tadbirlar, ijtimoiy yordam, ma'naviyat, тадбир, мактаб, спорт, ижтимоий",
      },
      {
        nomi: "Hokimiyat (Xotin-qizlar)",
        masulShaxs: "Tilavova Maqsuda Barnoqulovna",
        lavozimi: "Xotin-qizlar bo‘limi boshlig‘i",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "xotin_qizlar",
        active: true,
        keywords:
          "ayollar, xotin-qizlar, ayollar daftari, oilaviy ajrim, aliment, zo'ravonlik, ayol yordam, тазйиқ, аёллар дафтари, хотин-қизлар, ажрим, алимент",
      },
      {
        nomi: "Bandlik bo‘limi",
        masulShaxs: "Bekov Nazir Nodirjonovich",
        lavozimi: "Bandlik bo‘limi boshlig‘i",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "bandlik",
        active: true,
        keywords:
          "ish, ish topish, bandlik, ishsizlik, subsidiya, mehnat, mehnat daftarchasi, vakant, bo'sh ish o'rni, биржа, ишсизлик, бандлик, иш қидириш, ишга жойлашиш",
      },
      {
        nomi: "Iqtisodiyot va moliya bo‘limi",
        masulShaxs: "Naimov Namoz Sharipovich",
        lavozimi: "Bo‘lim boshliq o‘rinbosari",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "moliya",
        active: true,
        keywords:
          "moliya, budjet, oylik, maosh, byudjet, pul ajratish, moliyalashtirish, g'aznachilik, бюджет, ойлик, пул, молия, маош",
      },
      {
        nomi: "Pensiya bo‘limi",
        masulShaxs: "Po‘latov Farrux Fazliddinovich",
        lavozimi: "Boshliq",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "pensiya",
        active: true,
        keywords:
          "pensiya, nafaqa, pensiya jamg'armasi, yoshga doir, staj, bola puli, 1-guruh, 2-guruh, nogironlik nafaqasi, пенсия, нафақа, стаж, бола пули",
      },
      {
        nomi: "Savdo-sanoat palatasi tuman bo‘limi",
        masulShaxs: "Hasanov Abdullo Asatullayevich",
        lavozimi: "Boshliq",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "tadbirkorlik",
        active: true,
        keywords:
          "tadbirkor, palata, ssp, tadbirkorlik, biznes, litsenziya, kredit olish, tadbirkor huquqi, бизнес, тадбиркор, лицензия, кредит",
      },
      {
        nomi: "Shofirkon “Dehqon bozori” MChJ",
        masulShaxs: "Hamroyev Iskandar Arabovich",
        lavozimi: "Shofirkon “Dehqon bozori” MChJ raisi",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "bozor",
        active: true,
        keywords:
          "dehqon bozori, oziq-ovqat narxi, rasta, bozordagi narx-navo, go'sht narxi, sotuvchi, tarozi, oziq-ovqat, kartoshka, piyoz, деҳқон бозори, раста, гўшт, картошка, бозор нархи",
      },
      {
        nomi: "O‘zbekiston mahallalari uyushmasi Shofirkon tuman bo‘limi",
        masulShaxs: "Tolibov Nasullo Ibodovich",
        lavozimi: "Bo‘lim boshlig‘i",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "mahalla",
        active: true,
        keywords:
          "mahalla, rais, mahalla raisi, ko'cha, mahalla faollari, ma'lumotnoma, mahalla idorasi, маҳалла, раис, кўча, маҳалла раиси",
      },
      {
        nomi: "Shofirkon tumani “Inson” ijtimoiy xizmatlar markazi",
        masulShaxs: "Yo‘ldosheva Tursunoy Abrorovna",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "inson_markazi",
        active: true,
        keywords:
          "inson markazi, ijtimoiy xodimi, yetim bolalar, yolg'iz keksalar, nogironligi bor shaxslar, vasiylik, homiylik, инсон маркази, ногиронлик, ёлғиз кексалар",
      },
      {
        nomi: "Shofirkon tumani obodonlashtirish",
        masulShaxs: "Murodov T. (V.V.B)",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "obodonlashtirish",
        active: true,
        keywords:
          "ko'cha tozalash, daraxt kesish, chiqindi, musor, ko'chalarni supirish, ariq tozalash, musor mashina, musorxona, svitofor chirog'i, ободонлаштириш, чиқинди, мусор, дарахт, ариқ",
      },
      {
        nomi: "Shofirkon tumani yoshlar ittifoqi",
        masulShaxs: "Safarov D.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "yoshlar_ittifoqi",
        active: true,
        keywords:
          "yoshlar ittifoqi, yoshlar daftari, stipendiya, yoshlar ittifoqi sardori, yoshlar tadbiri, ёшлар иттифоқи, ёшлар дафтари",
      },
      {
        nomi: "Shofirkon tumani Agrobank boshlig'i",
        masulShaxs: "Nazarov J.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "Agro_bank",
        active: true,
        keywords:
          "agrobank, bank, kredit, plastik karta, terminal, foiz, agrobank krediti, bankomat, банкомат, агробанк, кредит, пластик карта",
      },
      {
        nomi: "Shofirkon tumani Buyum bozor boshlig'i",
        masulShaxs: "Hakimov R.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "Buyum_bozor",
        active: true,
        keywords:
          "kiyim bozori, buyumlar, kiyim-kechak, krossovka, kiyim rastasi, kiyimlar, latta-putta, kiyim bozori narxi, буюм бозори, кийим бозори, кийим-кечак",
      },
      {
        nomi: "Shofirkon tumani Maktabgacha ta'lim boshlig'i",
        masulShaxs: "Tolibov Ma'ruf",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "Maktabgacha_talim",
        active: true,
        keywords:
          "bog'cha, maktabgacha ta'lim, bogcha, bog'cha puli, bog'cha mudirasi, tarbiyachi, боғча, мактабгача таълим, тарбиячи",
      },
      {
        nomi: "Shofirkon tumani Sog'liqni saqlash",
        masulShaxs: "Nosirov A.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "Sog'liqni_saqlash",
        active: true,
        keywords:
          "kasalxona, poliklinika, tez yordam, shifokor, vrach, dori-darmon, tez yordam mashinasi, tez tibbiy yordam, доктори, доктор, касалхона, поликлиника, тез ёрдам, врач",
      },
      {
        nomi: "Shofirkon tumani Gaz ta'minoti",
        masulShaxs: "Shodiyev S.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "gaz_taminoti",
        active: true,
        keywords:
          "gaz, truba, propan, metan, ballondan gaz, gaz bosimi, rayon gaz, hududgaz, gaz yo'q, shlang, gaza, gaz o'chdi, газ, труба, пропан, газ босими, райгаз",
      },
      {
        nomi: "Shofirkon tumani Suv-oqova tami'noti",
        masulShaxs: "Rizoyev M.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "suv_oqova",
        active: true,
        keywords:
          "suv, ichimlik suvi, kanalizatsiya, oqova suv, nasos, vodoprovod, vodokanal, suv yorildi, jo'mrak, quvur, кран, сув, водоканал, канализация, труба",
      },
      {
        nomi: "Shofirkon tumani yo'l tami'noti",
        masulShaxs: "To'rayev O.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "yo'l_taminoti",
        active: true,
        keywords:
          "yo'l, asfalt, chuqur, yamalar, svetofor, yo'l belgisi, ko'prik, asfalt yotqizish, shag'al, yultaminoti, йўл, асфальт, чуқур, кўприк",
      },
      {
        nomi: "Shofirkon tumani qishloq xo'jalik bo'limi",
        masulShaxs: "G'afforov B.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "qishloq_xo'jalik",
        active: true,
        keywords:
          "paxta, g'alla, g'allachilik, traktor, klaster, dala, ekin, bug'doy, kombayn, qishloq xo'jaligi, пахта, ғалла, экин, трактор, дала",
      },
      {
        nomi: "Shofirkon tumani veterenariya bo'limi",
        masulShaxs: "Saidov X.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "veterenariya",
        active: true,
        keywords:
          "mol-hol, emlash, mol kasalligi, veterinar, chorva, qoramol, qo'y, veterinariya, ветеринария, мол-ҳол, эмлаш, чорва",
      },
      {
        nomi: "Shofirkon tumani tik-quduqlar bilan ishlash",
        masulShaxs: "Jumayev S.",
        lavozimi: "Direktor",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "tik_quduq",
        active: true,
        keywords:
          "tik quduq, artesian, sug'orish qudug'i, nasos quduq, vertikal quduq, ekin suvi, artezian, кудуқ, тик қудуқ, артезиан, суғориш",
      },
      // 🌟 ENG MUHIM QO'SHIMCHA: (O'tgan safargi xatolik qaytarilmasligi uchun)
      {
        nomi: "Shofirkon tuman elektr tarmoqlari korxonasi (ETK)",
        masulShaxs: "Nishonov E.",
        lavozimi: "Boshliq",
        telegramId: TEST_TELEGRAM_ID,
        kategoriya: "elektr_taminoti",
        active: true,
        keywords:
          "svet, tok, transformator, liniya, elektr, o'chdi, stolba, sim, elektr tarmog'i, simyog'och, kuchlanish, faza, schotchik, tuman elektr, svet yo'q, ток, свет, трансформатор, электр, ўчди, сим, столб",
      },
    ],
  });

  console.log("✅ Organization seed yakunlandi");
}

main()
  .catch((error) => {
    console.error("❌ Seed xatosi:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
