// src/app/api/student/submit-vote/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ElectionStatus, PositionType } from "@prisma/client";
import { getEffectiveStatus, getEffectiveEndDate } from "@/lib/electionUtils";
import { writeAuditLog, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const ipAddress = getIpAddressFromRequest(request);
  let ballotPayloadForLog; // Store for error logging

  if (!session || !session.user || session.user.role !== "STUDENT") {
    await writeAuditLog({
      actorId: session?.user?.id || "unknown",
      actorEmail: session?.user?.email || "unknown",
      actorType:
        session?.user?.role === "STUDENT"
          ? AuditActorType.STUDENT
          : AuditActorType.UNKNOWN,
      actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
      status: AuditLogStatus.FAILURE,
      details: { error: "Forbidden: Student access only." },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Forbidden: Student access only." },
      { status: 403 }
    );
  }

  const studentId = session.user.id;
  const studentEmail = session.user.email;
  const studentCollege = session.user.college;

  try {
    ballotPayloadForLog = await request.json();
    const { electionId, uscSelections, cscSelections } = ballotPayloadForLog;

    if (
      !electionId ||
      typeof uscSelections !== "object" ||
      typeof cscSelections !== "object"
    ) {
      await writeAuditLog({
        actorId: studentId,
        actorEmail: studentEmail,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Invalid ballot data structure.",
          electionId,
          ballotPayload: ballotPayloadForLog,
        },
        ipAddress,
      });
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
      await writeAuditLog({
        actorId: studentId,
        actorEmail: studentEmail,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: { error: "Election not found." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    const effectiveStatus = getEffectiveStatus(election, studentCollege);

    if (effectiveStatus !== ElectionStatus.ONGOING) {
      await writeAuditLog({
        actorId: studentId,
        actorEmail: studentEmail,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Voting for this election is not currently open.",
          electionStatus: effectiveStatus,
          electionName: election.name,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Voting for this election is not currently open." },
        { status: 403 }
      );
    }

    // 2. Verify student has not already voted in this election
    const existingVoteRecord = await prisma.studentElectionVote.findUnique({
      where: {
        studentId_electionId: { studentId, electionId },
      },
    });
    if (existingVoteRecord) {
      await writeAuditLog({
        actorId: studentId,
        actorEmail: studentEmail,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Student has already voted in this election.",
          electionName: election.name,
        },
        ipAddress,
      });
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
        await writeAuditLog({
          actorId: studentId,
          actorEmail: studentEmail,
          actorType: AuditActorType.STUDENT,
          actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: `Invalid selection format for position ${positionId}.`,
            positionId,
            ballotPayload: ballotPayloadForLog,
          },
          ipAddress,
        });
        return NextResponse.json(
          { error: `Invalid selection format for position ${positionId}.` },
          { status: 400 }
        );
      }

      const position = election.positions.find((p) => p.id === positionId);
      if (!position) {
        await writeAuditLog({
          actorId: studentId,
          actorEmail: studentEmail,
          actorType: AuditActorType.STUDENT,
          actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: `Invalid position ID ${positionId} found in ballot.`,
            positionId,
            ballotPayload: ballotPayloadForLog,
          },
          ipAddress,
        });
        return NextResponse.json(
          { error: `Invalid position ID ${positionId} found in ballot.` },
          { status: 400 }
        );
      }
      if (selectedCandidateIds.length > position.maxVotesAllowed) {
        await writeAuditLog({
          actorId: studentId,
          actorEmail: studentEmail,
          actorType: AuditActorType.STUDENT,
          actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: `Too many candidates selected for position "${position.name}".`,
            positionId: position.id,
            positionName: position.name,
            maxAllowed: position.maxVotesAllowed,
            selectedCount: selectedCandidateIds.length,
            ballotPayload: ballotPayloadForLog, // Log the problematic part of the ballot
          },
          ipAddress,
        });
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
          await writeAuditLog({
            actorId: studentId,
            actorEmail: studentEmail,
            actorType: AuditActorType.STUDENT,
            actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
            status: AuditLogStatus.FAILURE,
            entityType: "Election",
            entityId: electionId,
            details: {
              error: `Invalid candidate ID ${candId} for position ${position.name}.`,
              candidateId: candId,
              positionId: position.id,
              positionName: position.name,
              ballotPayload: ballotPayloadForLog,
            },
            ipAddress,
          });
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
      await writeAuditLog({
        actorId: studentId,
        actorEmail: studentEmail,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error:
            "Vote submission transaction failed internally after validation.",
          electionName: election.name,
          ballotPayload: ballotPayloadForLog,
        },
        ipAddress,
      });
      throw new Error("Vote submission transaction failed internally.");
    }

    await writeAuditLog({
      actorId: studentId,
      actorEmail: studentEmail,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Election",
      entityId: electionId,
      details: {
        message: "Vote submitted successfully.",
        electionName: election.name,
        ballotId: transactionResult.ballotId,
      },
      ipAddress,
    });

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
    await writeAuditLog({
      actorId: studentId,
      actorEmail: studentEmail,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.VOTE_SUBMITTED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: ballotPayloadForLog?.electionId || "unknown",
      details: {
        error: error.message || "Failed to submit vote.",
        errorCode: error.code,
        ballotPayloadAttempt: ballotPayloadForLog
          ? JSON.stringify(ballotPayloadForLog)
          : "Ballot payload not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      ipAddress,
    });
    return NextResponse.json(
      { error: error.message || "Failed to submit vote." },
      { status: 500 }
    );
  }
}
