-- CreateTable
CREATE TABLE "StudentElectionVote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentElectionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentElectionVote_electionId_idx" ON "StudentElectionVote"("electionId");

-- CreateIndex
CREATE INDEX "StudentElectionVote_studentId_idx" ON "StudentElectionVote"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentElectionVote_studentId_electionId_key" ON "StudentElectionVote"("studentId", "electionId");
