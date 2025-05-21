/*
  Warnings:

  - You are about to drop the column `college` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Election` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Election_type_college_idx";

-- AlterTable
ALTER TABLE "Election" DROP COLUMN "college",
DROP COLUMN "type";

-- DropEnum
DROP TYPE "ElectionType";

-- CreateTable
CREATE TABLE "ElectionExtension" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "college" "College" NOT NULL,
    "extendedEndDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionExtension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectionExtension_electionId_college_key" ON "ElectionExtension"("electionId", "college");
