import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

type PdfData = {
  appealNumber: string;
  citizenName: string;
  username?: string | null;
  phone?: string | null;
  organization?: string | null;
  aiSummary?: string | null;
  originalText: string;
  photoPaths?: string[];
};

function fontPath(fileName: string) {
  return path.join(process.cwd(), "assets", "fonts", fileName);
}

export async function generateAppealPdf(data: PdfData): Promise<string> {
  const dir = path.join(process.cwd(), "storage", "pdfs");
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${data.appealNumber}.pdf`);

  const regularFont = fontPath("NotoSans-Regular.ttf");
  const boldFont = fontPath("NotoSans-Bold.ttf");

  if (!fs.existsSync(regularFont)) {
    throw new Error(
      "NotoSans-Regular.ttf topilmadi: assets/fonts ichiga qo‘ying"
    );
  }

  if (!fs.existsSync(boldFont)) {
    throw new Error("NotoSans-Bold.ttf topilmadi: assets/fonts ichiga qo‘ying");
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.registerFont("Regular", regularFont);
  doc.registerFont("Bold", boldFont);

  doc.font("Bold").fontSize(18).text("Shofirkon AI Nazorat tizimi", {
    align: "center",
  });

  doc.moveDown();

  doc.font("Bold").fontSize(13).text("Murojaat ma’lumotlari");
  doc.font("Regular").fontSize(11);
  doc.text(`Murojaat raqami: ${data.appealNumber}`);
  doc.text(`Sana: ${new Date().toLocaleString("uz-UZ")}`);

  doc.moveDown();

  doc.font("Bold").fontSize(13).text("Fuqaro ma’lumotlari");
  doc.font("Regular").fontSize(11);
  doc.text(`Fuqaro: ${data.citizenName || "Noma’lum"}`);
  doc.text(
    `Username: ${data.username ? "@" + data.username : "ko‘rsatilmagan"}`
  );
  doc.text(`Telefon: ${data.phone || "ko‘rsatilmagan"}`);

  doc.moveDown();

  doc.font("Bold").fontSize(13).text("Biriktirilgan tashkilot");
  doc.font("Regular").fontSize(11);
  doc.text(data.organization || "Aniqlanmagan");

  doc.moveDown();

  doc.font("Bold").fontSize(13).text("AI xulosa");
  doc
    .font("Regular")
    .fontSize(11)
    .text(data.aiSummary || "Xulosa mavjud emas", {
      width: 500,
      align: "left",
    });

  doc.moveDown();

  doc.font("Bold").fontSize(13).text("Asl murojaat matni");
  doc
    .font("Regular")
    .fontSize(11)
    .text(data.originalText || "Matn mavjud emas", {
      width: 500,
      align: "left",
    });

  if (data.photoPaths?.length) {
    doc.addPage();

    doc.font("Bold").fontSize(14).text("Ilova qilingan rasmlar", {
      align: "center",
    });

    doc.moveDown();

    for (const photoPath of data.photoPaths) {
      try {
        if (doc.y > 520) {
          doc.addPage();
        }

        doc.image(photoPath, {
          fit: [450, 350],
          align: "center",
        });

        doc.moveDown();
      } catch {
        doc
          .font("Regular")
          .fontSize(10)
          .text(`Rasm PDFga qo‘shilmadi: ${photoPath}`);
      }
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}
