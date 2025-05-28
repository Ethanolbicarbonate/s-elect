// src/app/api/admin/results/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType, College, ElectionStatus } from "@prisma/client";

// --- Helper Functions (More robust, copied from election-results.js) ---
// This function needs to be externalized if used in multiple API routes
// For now, including it here. If you have a central 'lib/helpers.js' or 'lib/utils.js', move it there.
function determineWinners(candidates, maxVotesAllowed) {
  if (!candidates || candidates.length === 0) {
    // Ensure all candidates have an isWinner flag, default to false if no winners
    return candidates
      ? candidates.map((cand) => ({ ...cand, isWinner: false }))
      : [];
  }

  // Sort candidates by votesReceived in descending order
  // Secondary sort by name (e.g., lastName then firstName) for stable ordering in case of vote ties
  const sorted = [...candidates].sort((a, b) => {
    if (b.votesReceived !== a.votesReceived) {
      return b.votesReceived - a.votesReceived;
    }
    if (a.lastName < b.lastName) return -1;
    if (a.lastName > b.lastName) return 1;
    if (a.firstName < b.firstName) return -1;
    if (a.firstName > b.firstName) return 1;
    return 0;
  });

  const winnersSet = new Set();
  let winningThreshold = 0;

  if (maxVotesAllowed > 0) {
    for (let i = 0; i < sorted.length; i++) {
      // If a candidate has 0 votes, they (and subsequent candidates) cannot be winners.
      if (sorted[i].votesReceived === 0) {
        break;
      }

      if (i < maxVotesAllowed) {
        winnersSet.add(sorted[i].id);
        winningThreshold = sorted[i].votesReceived;
      } else if (sorted[i].votesReceived === winningThreshold) {
        // Include any candidates tied with the candidate in the last winning spot
        winnersSet.add(sorted[i].id);
      } else {
        // No more candidates are tied with or surpass the winning threshold
        break;
      }
    }
  }

  return sorted.map((cand) => ({
    ...cand,
    isWinner: winnersSet.has(cand.id),
  }));
}
// --- End Helper Functions ---

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "AUDITOR", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  const { userRole, userCollege } = {
    userRole: session.user.role,
    userCollege: session.user.college,
  };
  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("electionId");
  const scopeTypeParam = searchParams.get("scopeType")?.toUpperCase();
  const collegeParam = searchParams.get("college")?.toUpperCase();

  if (!electionId) {
    return NextResponse.json(
      { error: "Election ID is required." },
      { status: 400 }
    );
  }

  let queryScopeType;
  let queryCollege = null;

  if (userRole === "SUPER_ADMIN" || userRole === "AUDITOR") {
    if (!scopeTypeParam) {
      queryScopeType = PositionType.USC; // Default to USC if SA/Auditor doesn't specify
    } else if (scopeTypeParam === PositionType.USC) {
      queryScopeType = PositionType.USC;
    } else if (scopeTypeParam === PositionType.CSC) {
      queryScopeType = PositionType.CSC;
      if (!collegeParam || !Object.values(College).includes(collegeParam)) {
        return NextResponse.json(
          { error: "A valid college is required for CSC scope." },
          { status: 400 }
        );
      }
      queryCollege = collegeParam;
    } else {
      return NextResponse.json(
        { error: "Invalid scope type provided." },
        { status: 400 }
      );
    }
  } else {
    // MODERATOR
    if (userCollege) {
      // College Moderator
      queryScopeType = PositionType.CSC;
      queryCollege = userCollege;
      if (scopeTypeParam && scopeTypeParam !== PositionType.CSC)
        return NextResponse.json(
          { error: "Forbidden: Scope mismatch." },
          { status: 403 }
        );
      if (collegeParam && collegeParam !== userCollege)
        return NextResponse.json(
          { error: "Forbidden: College mismatch." },
          { status: 403 }
        );
    } else {
      // USC Moderator
      queryScopeType = PositionType.USC;
      if (scopeTypeParam && scopeTypeParam !== PositionType.USC)
        return NextResponse.json(
          { error: "Forbidden: Scope mismatch." },
          { status: 403 }
        );
      if (collegeParam)
        return NextResponse.json(
          { error: "Forbidden: College parameter not allowed for USC scope." },
          { status: 403 }
        );
    }
  }

  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    // --- 1. Voter Turnout (relevant to this specific API's scope) ---
    let eligibleVoters = 0;
    if (queryScopeType === PositionType.USC) {
      eligibleVoters = await prisma.student.count();
    } else if (queryScopeType === PositionType.CSC && queryCollege) {
      eligibleVoters = await prisma.student.count({
        where: { college: queryCollege },
      });
    }

    const votesCastInScope = await prisma.studentElectionVote.count({
      where: {
        electionId: electionId,
        ...(queryScopeType === PositionType.CSC &&
          queryCollege && {
            student: { college: queryCollege },
          }),
      },
    });

    const turnoutPercentage =
      eligibleVoters > 0
        ? parseFloat(((votesCastInScope / eligibleVoters) * 100).toFixed(2))
        : 0;

    const voterTurnout = {
      eligibleVoters,
      votesCastInScope,
      turnoutPercentage,
    };

    // --- 2. Positions and Candidate Votes ---
    const positionsInScope = await prisma.position.findMany({
      where: {
        electionId: electionId,
        type: queryScopeType,
        college: queryCollege,
      },
      orderBy: { order: "asc" },
    });

    const positionResults = [];

    for (const position of positionsInScope) {
      const candidatesForPosition = await prisma.candidate.findMany({
        where: {
          electionId: electionId,
          positionId: position.id,
        },
        include: {
          partylist: true,
        },
        orderBy: {
          votesReceived: "desc",
        },
      });

      const totalVotesCastForPosition = candidatesForPosition.reduce(
        (sum, cand) => sum + cand.votesReceived,
        0
      );

      // Pass candidatesForPosition to determineWinners, it will add isWinner flag
      const candidatesWithWinnerFlag = determineWinners(
        candidatesForPosition,
        position.maxVotesAllowed
      );

      const candidatesData = candidatesWithWinnerFlag.map((cand) => ({
        // Use the output from determineWinners
        id: cand.id,
        firstName: cand.firstName,
        lastName: cand.lastName,
        nickname: cand.nickname,
        photoUrl: cand.photoUrl,
        partylistId: cand.partylistId, // Keep partylistId for client logic if needed
        partylistName: cand.partylist?.name || null,
        partylistAcronym: cand.partylist?.acronym || null,
        isIndependent: cand.isIndependent,
        votesReceived: cand.votesReceived,
        percentageOfPositionVotes:
          totalVotesCastForPosition > 0
            ? parseFloat(
                (
                  (cand.votesReceived / totalVotesCastForPosition) *
                  100
                ).toFixed(2)
              )
            : 0,
        isWinner: cand.isWinner, // This is now directly from determineWinners output
      }));

      positionResults.push({
        id: position.id,
        name: position.name,
        type: position.type,
        college: position.college,
        maxVotesAllowed: position.maxVotesAllowed,
        totalVotesCastForPosition: totalVotesCastForPosition,
        candidates: candidatesData,
        // winnerCandidateIds: winnerCandidateIds, // No longer needed, isWinner is on candidate
      });
    }

    return NextResponse.json(
      {
        electionId: election.id,
        electionName: election.name,
        scope: {
          type: queryScopeType,
          college: queryCollege,
        },
        voterTurnout: voterTurnout,
        positions: positionResults, // Renamed from 'positionResults' to 'positions' for consistency with LiveTallyWidget
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error fetching results for election ${electionId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch election results. " + error.message },
      { status: 500 }
    );
  }
}
