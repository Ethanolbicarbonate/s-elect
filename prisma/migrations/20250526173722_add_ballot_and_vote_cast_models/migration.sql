-- CreateTable
CREATE TABLE "SubmittedBallot" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmittedBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteCast" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,

    CONSTRAINT "VoteCast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmittedBallot_studentId_idx" ON "SubmittedBallot"("studentId");

-- CreateIndex
CREATE INDEX "SubmittedBallot_electionId_idx" ON "SubmittedBallot"("electionId");

-- CreateIndex
CREATE INDEX "VoteCast_ballotId_idx" ON "VoteCast"("ballotId");

-- CreateIndex
CREATE INDEX "VoteCast_positionId_idx" ON "VoteCast"("positionId");

-- CreateIndex
CREATE INDEX "VoteCast_candidateId_idx" ON "VoteCast"("candidateId");

-- CreateIndex
CREATE INDEX "VoteCast_electionId_idx" ON "VoteCast"("electionId");
