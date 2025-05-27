// src/app/api/admin/results/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed
import { PositionType, College, ElectionStatus } from "@prisma/client";

// Helper function for winner determination (can be moved to utils)
function determineWinners(candidatesInPosition, maxVotesAllowed) {
  if (!candidatesInPosition || candidatesInPosition.length === 0) {
    return [];
  }
  // Assumes candidatesInPosition are already sorted by votesReceived descending by the caller
  const winners = [];
  if (maxVotesAllowed === 1) {
    const highestVote = candidatesInPosition[0].votesReceived;
    if (highestVote > 0) {
      for (const cand of candidatesInPosition) {
        if (cand.votesReceived === highestVote) {
          winners.push(cand.id);
        } else {
          break; 
        }
      }
    }
  } else { // Multi-winner (e.g., Councilors)
    let lastWinningVoteCount = -1;
    for (let i = 0; i < candidatesInPosition.length; i++) {
      const currentCandidate = candidatesInPosition[i];
      if (currentCandidate.votesReceived <= 0) break; // No more winners if votes are 0 or less

      if (winners.length < maxVotesAllowed) {
        winners.push(currentCandidate.id);
        lastWinningVoteCount = currentCandidate.votesReceived;
      } else if (currentCandidate.votesReceived === lastWinningVoteCount) {
        // Tie for the last spot(s), include them
        winners.push(currentCandidate.id);
      } else {
        break; // Filled max winners and no more ties for the last spot
      }
    }
  }
  return winners;
}


export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !['SUPER_ADMIN', 'AUDITOR', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden: Insufficient privileges." }, { status: 403 });
  }

  const { userRole, userCollege } = { userRole: session.user.role, userCollege: session.user.college }; // Simplified
  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get('electionId');
  const scopeTypeParam = searchParams.get('scopeType')?.toUpperCase(); // USC or CSC
  const collegeParam = searchParams.get('college')?.toUpperCase();   // College Enum value

  if (!electionId) {
    return NextResponse.json({ error: "Election ID is required." }, { status: 400 });
  }

  let queryScopeType;
  let queryCollege = null; // Must be null for USC scope

  if (userRole === 'SUPER_ADMIN' || userRole === 'AUDITOR') {
    if (!scopeTypeParam) {
      // Default to USC if SA/Auditor doesn't specify, or return error
      // For now, let's default to USC for simplicity in this boilerplate
      queryScopeType = PositionType.USC; 
      // return NextResponse.json({ error: "Scope type (USC/CSC) is required for Super Admin/Auditor." }, { status: 400 });
    } else if (scopeTypeParam === PositionType.USC) {
      queryScopeType = PositionType.USC;
    } else if (scopeTypeParam === PositionType.CSC) {
      queryScopeType = PositionType.CSC;
      if (!collegeParam || !Object.values(College).includes(collegeParam)) {
        return NextResponse.json({ error: "A valid college is required for CSC scope." }, { status: 400 });
      }
      queryCollege = collegeParam;
    } else {
      return NextResponse.json({ error: "Invalid scope type provided." }, { status: 400 });
    }
  } else { // MODERATOR
    if (userCollege) { // College Moderator
      queryScopeType = PositionType.CSC;
      queryCollege = userCollege;
      // Security: If params are provided by College Mod, they MUST match their scope
      if (scopeTypeParam && scopeTypeParam !== PositionType.CSC) return NextResponse.json({ error: "Forbidden: Scope mismatch." }, { status: 403 });
      if (collegeParam && collegeParam !== userCollege) return NextResponse.json({ error: "Forbidden: College mismatch." }, { status: 403 });
    } else { // USC Moderator
      queryScopeType = PositionType.USC;
      // Security: If params are provided by USC Mod, they MUST match their scope
      if (scopeTypeParam && scopeTypeParam !== PositionType.USC) return NextResponse.json({ error: "Forbidden: Scope mismatch." }, { status: 403 });
      if (collegeParam) return NextResponse.json({ error: "Forbidden: College parameter not allowed for USC scope." }, { status: 403 });
    }
  }

  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      return NextResponse.json({ error: "Election not found." }, { status: 404 });
    }

    // --- 1. Voter Turnout ---
    let eligibleVoters = 0;
    if (queryScopeType === PositionType.USC) {
      eligibleVoters = await prisma.student.count();
    } else if (queryScopeType === PositionType.CSC && queryCollege) {
      eligibleVoters = await prisma.student.count({ where: { college: queryCollege } });
    }

    // Count students who submitted a ballot FOR THIS ELECTION and match the scope
    const votesCastInScope = await prisma.studentElectionVote.count({
      where: {
        electionId: electionId,
        ...(queryScopeType === PositionType.CSC && queryCollege && { 
            student: { college: queryCollege } 
        }) 
        // For USC scope, count all votes in the election.
        // If you need to ensure USC voters are from any valid college, this query might need adjustment
        // or accept that StudentElectionVote for an electionId implies a valid voter.
      }
    });
    
    const turnoutPercentage = eligibleVoters > 0 ? parseFloat(((votesCastInScope / eligibleVoters) * 100).toFixed(2)) : 0;

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
        college: queryCollege, // Prisma handles null for college if queryCollege is null
      },
      orderBy: { order: 'asc' },
    });

    const positionResults = [];

    for (const position of positionsInScope) {
      const candidatesForPosition = await prisma.candidate.findMany({
        where: {
          electionId: electionId,
          positionId: position.id,
        },
        include: {
          partylist: true, // To get partylist name
        },
        orderBy: {
          votesReceived: 'desc', // Important for winner determination
        },
      });

      const totalVotesCastForPosition = candidatesForPosition.reduce((sum, cand) => sum + cand.votesReceived, 0);
      
      const winnerCandidateIds = determineWinners(candidatesForPosition, position.maxVotesAllowed);

      const candidatesData = candidatesForPosition.map(cand => ({
        id: cand.id,
        firstName: cand.firstName,
        lastName: cand.lastName,
        nickname: cand.nickname,
        photoUrl: cand.photoUrl,
        partylistId: cand.partylistId,
        partylistName: cand.partylist?.name || null,
        partylistAcronym: cand.partylist?.acronym || null,
        isIndependent: cand.isIndependent,
        votesReceived: cand.votesReceived,
        percentageOfPositionVotes: totalVotesCastForPosition > 0 
            ? parseFloat(((cand.votesReceived / totalVotesCastForPosition) * 100).toFixed(2)) 
            : 0,
        isWinner: winnerCandidateIds.includes(cand.id),
      }));

      positionResults.push({
        id: position.id,
        name: position.name,
        type: position.type,
        college: position.college,
        maxVotesAllowed: position.maxVotesAllowed,
        totalVotesCastForPosition: totalVotesCastForPosition,
        candidates: candidatesData,
        winnerCandidateIds: winnerCandidateIds,
      });
    }

    return NextResponse.json({
      electionId: election.id,
      electionName: election.name,
      scope: {
        type: queryScopeType,
        college: queryCollege,
      },
      voterTurnout: voterTurnout,
      positions: positionResults,
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error(`Error fetching results for election ${electionId}:`, error);
    return NextResponse.json({ error: "Failed to fetch election results. " + error.message }, { status: 500 });
  }
}