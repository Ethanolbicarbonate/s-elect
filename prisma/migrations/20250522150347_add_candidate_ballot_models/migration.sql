-- CreateEnum
CREATE TYPE "PositionType" AS ENUM ('USC', 'CSC');

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PositionType" NOT NULL,
    "college" "College",
    "maxVotesAllowed" INTEGER NOT NULL,
    "minVotesRequired" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "electionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partylist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "logoUrl" TEXT,
    "platform" TEXT,
    "electionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "nickname" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "platformPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "electionId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "partylistId" TEXT,
    "votesReceived" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_electionId_name_college_key" ON "Position"("electionId", "name", "college");

-- CreateIndex
CREATE UNIQUE INDEX "Partylist_electionId_name_key" ON "Partylist"("electionId", "name");
