/*
  Warnings:

  - Added the required column `type` to the `Partylist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Partylist" ADD COLUMN     "college" "College",
ADD COLUMN     "type" "PositionType" NOT NULL;
