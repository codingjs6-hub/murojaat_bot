/*
  Warnings:

  - You are about to drop the column `holat` on the `Appeal` table. All the data in the column will be lost.
  - Added the required column `deadline` to the `Appeal` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('IN_PROGRESS', 'RESOLVED', 'OVERDUE');

-- AlterTable
ALTER TABLE "Appeal" DROP COLUMN "holat",
ADD COLUMN     "deadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AppealStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
