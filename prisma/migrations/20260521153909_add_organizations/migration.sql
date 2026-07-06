-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "nomi" TEXT NOT NULL,
    "masulShaxs" TEXT NOT NULL,
    "lavozimi" TEXT,
    "telegramId" BIGINT,
    "username" TEXT,
    "telefon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
