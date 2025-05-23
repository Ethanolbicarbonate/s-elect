-- CreateEnum
CREATE TYPE "ElectionScopeType" AS ENUM ('USC', 'CSC');

-- AlterTable
ALTER TABLE "Election" ADD COLUMN     "college" "College",
ADD COLUMN     "scopeType" "ElectionScopeType";
