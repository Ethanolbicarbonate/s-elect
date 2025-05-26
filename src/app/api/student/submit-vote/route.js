// src/app/api/student/submit-vote/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ElectionStatus, PositionType } from "@prisma/client";
import { getEffectiveStatus, getEffectiveEndDate } from "@/lib/electionUtils";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Forbidden: Student access only." },
      { status: 403 }
    );
  }

  const studentId = session.user.id;
  const studentCollege = session.user.college;

  try {
    const ballotPayload = await request.json();
    const { electionId, uscSelections, cscSelections } = ballotPayload;

    if (
      !electionId ||
      typeof uscSelections !== "object" ||
      typeof cscSelections !== "object"
    ) {
      return NextResponse.json(
        { error: "Invalid ballot data." },
        { status: 400 }
      );
    }

    // 1. Fetch Election and verify it's ONGOING for this student
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        extensions: true,
        positions: true,
      },
    });

    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    const effectiveStatus = getEffectiveStatus(election, studentCollege);

    if (effectiveStatus !== ElectionStatus.ONGOING) {
      return NextResponse.json(
        { error: "Voting for this election is not currently open." },
        { status: 403 }
      );
    }

    // 2. Verify student has not already voted in this election (using the new model)
    const existingVoteRecord = await prisma.studentElectionVote.findUnique({
      where: {
        studentId_electionId: { studentId, electionId },
      },
    });
    if (existingVoteRecord) {
      return NextResponse.json(
        { error: "You have already voted in this election." },
        { status: 403 }
      );
    }

    // 3. Validate selections against maxVotesAllowed for each position
    const allSelections = { ...uscSelections, ...cscSelections };
    for (const positionId in allSelections) {
      const selectedCandidateIds = allSelections[positionId]; // This is an array of candidate IDs
      if (!Array.isArray(selectedCandidateIds)) {
        return NextResponse.json(
          { error: `Invalid selection format for position ${positionId}.` },
          { status: 400 }
        );
      }

      const position = election.positions.find((p) => p.id === positionId);
      if (!position) {
        return NextResponse.json(
          { error: `Invalid position ID ${positionId} found in ballot.` },
          { status: 400 }
        );
      }
      if (selectedCandidateIds.length > position.maxVotesAllowed) {
        return NextResponse.json(
          {
            error: `Too many candidates selected for position "${position.name}". Max allowed: ${position.maxVotesAllowed}.`,
          },
          { status: 400 }
        );
      }
      // Optional: Check if selected candidate IDs are valid candidates for that position and election
      for (const candId of selectedCandidateIds) {
        const candidateExists = await prisma.candidate.count({
          where: { id: candId, electionId: electionId, positionId: positionId },
        });
        if (candidateExists === 0) {
          return NextResponse.json(
            {
              error: `Invalid candidate ID ${candId} for position ${position.name}.`,
            },
            { status: 400 }
          );
        }
      }
    }
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Record that the student has voted for this election
      await tx.studentElectionVote.create({
        data: { studentId: studentId, electionId: electionId },
      });

      // 2. Create a SubmittedBallot record
      const submittedBallot = await tx.submittedBallot.create({
        data: {
          studentId: studentId,
          electionId: electionId,
        },
      });

      // 3. Create VoteCast records for each selection & (optionally) increment candidate counters
      const voteCastCreates = [];
      const candidateUpdates = [];

      for (const positionId in uscSelections) {
        for (const candidateId of uscSelections[positionId]) {
          voteCastCreates.push({
            ballotId: submittedBallot.id,
            positionId: positionId,
            candidateId: candidateId,
            electionId: electionId,
          });
          candidateUpdates.push(
            tx.candidate.updateMany({
              where: {
                id: candidateId,
                electionId: electionId,
                positionId: positionId,
              },
              data: { votesReceived: { increment: 1 } },
            })
          );
        }
      }
      for (const positionId in cscSelections) {
        for (const candidateId of cscSelections[positionId]) {
          voteCastCreates.push({
            ballotId: submittedBallot.id,
            positionId: positionId,
            candidateId: candidateId,
            electionId: electionId,
          });
          candidateUpdates.push(
            tx.candidate.updateMany({
              where: {
                id: candidateId,
                electionId: electionId,
                positionId: positionId,
              },
              data: { votesReceived: { increment: 1 } },
            })
          );
        }
      }

      if (voteCastCreates.length > 0) {
        await tx.voteCast.createMany({
          data: voteCastCreates,
        });
      }

      // Perform candidate vote count updates
      await Promise.all(candidateUpdates);

      return { success: true, ballotId: submittedBallot.id };
    });

    if (!transactionResult.success) {
      throw new Error("Vote submission transaction failed internally.");
    }

    // Optionally return ballotId or some confirmation code
    return NextResponse.json(
      {
        message: "Vote submitted successfully!",
        ballotId: transactionResult.ballotId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit vote." },
      { status: 500 }
    );
  }
}
