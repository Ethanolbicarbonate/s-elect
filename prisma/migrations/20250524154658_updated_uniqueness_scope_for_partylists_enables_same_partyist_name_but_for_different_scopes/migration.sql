/*
  Warnings:

  - A unique constraint covering the columns `[electionId,name,type,college]` on the table `Partylist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Partylist_electionId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Partylist_electionId_name_type_college_key" ON "Partylist"("electionId", "name", "type", "college");
