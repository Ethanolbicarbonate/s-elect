// src/app/api/student/election-results/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ElectionStatus, PositionType, College } from "@prisma/client"; // Import enums

// --- Helper Functions (can be moved to a lib/utils file if reused) ---

// Helper to calculate turnout percentage
function calculatePercentage(voted, total) {
  if (total === 0) return 0;
  return (voted / total) * 100;
}

// Helper to determine winners for a position
// This function assumes:
// 1. Candidates array is passed in (from a Prisma query result).
// 2. `maxVotesAllowed` is the number of candidates who can win for that position.
// 3. Ties for the last winning spot are handled by including all tied candidates.
function determineWinners(candidates, maxVotesAllowed) {
  if (!candidates || candidates.length === 0) {
    return candidates.map((cand) => ({ ...cand, isWinner: false })); // Return candidates with isWinner:false
  }

  // Sort candidates by votesReceived in descending order
  // Secondary sort by name (e.g., lastName then firstName) for stable ordering in case of vote ties
  const sorted = [...candidates].sort((a, b) => {
    if (b.votesReceived !== a.votesReceived) {
      return b.votesReceived - a.votesReceived;
    }
    // Tie-breaking: sort alphabetically by last name, then first name
    if (a.lastName < b.lastName) return -1;
    if (a.lastName > b.lastName) return 1;
    if (a.firstName < b.firstName) return -1;
    if (a.firstName > b.firstName) return 1;
    return 0;
  });

  const winnersSet = new Set();
  let winningThreshold = 0; // The minimum votes for a winning position

  if (maxVotesAllowed > 0) {
    // Iterate through sorted candidates to determine winners
    for (let i = 0; i < sorted.length; i++) {
      // CRITICAL FIX: If a candidate has 0 votes, they (and subsequent candidates) cannot be winners.
      // Also, ensure we don't exceed maxVotesAllowed unless there's a tie.
      if (sorted[i].votesReceived === 0) {
        break; // Stop considering candidates if current one has 0 votes
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

  // Return all candidates with an `isWinner` flag
  return sorted.map((cand) => ({
    ...cand,
    isWinner: winnersSet.has(cand.id),
  }));
} // --- End Helper Functions ---

export async function GET(request) {
  const session = await getServerSession(authOptions);

  // Only students can access their results dashboard via this API
  if (!session || !session.user || session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Forbidden: Student access only." },
      { status: 403 }
    );
  }

  const studentCollege = session.user.college; // Get student's college for CSC filtering

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("electionId");

  if (!electionId) {
    return NextResponse.json(
      { error: "Election ID is required." },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch Election Details
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        status: true, // Actual status (e.g., ENDED, ONGOING)
        scopeType: true,
        college: true, // If CSC-scoped election, this will be the college
      },
    });

    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    // 2. Calculate Turnout Data
    // Total eligible students for the entire university (adjust as per your Student model's eligibility)
    const totalEligibleStudents = await prisma.student.count({
      where: {
        // Example eligibility: isEnrolled: true, isActive: true, emailVerified: { not: null }
        // Adjust based on your schema's definition of "eligible voter"
      },
    });
    const totalVotedInElection = await prisma.studentElectionVote.count({
      where: { electionId: electionId },
    });
    const overallTurnoutPercentage = calculatePercentage(
      totalVotedInElection,
      totalEligibleStudents
    );

    const uscTurnoutByCollege = []; // For USC elections, turnout broken down by college
    let specificCscTurnout = null; // For CSC elections, turnout for the student's college

    // Fetch turnout for all colleges (relevant for USC results)
    // Or if the election is USC-scoped, fetch all colleges.
    if (election.scopeType === PositionType.USC) {
      const allColleges = Object.values(College); // Get all enum values
      for (const collegeName of allColleges) {
        const studentsInCollege = await prisma.student.count({
          where: { college: collegeName },
        });
        const votesInCollege = await prisma.studentElectionVote.count({
          where: {
            electionId: electionId,
            student: { college: collegeName },
          },
        });
        uscTurnoutByCollege.push({
          college: collegeName,
          voted: votesInCollege,
          eligible: studentsInCollege,
          percentage: calculatePercentage(votesInCollege, studentsInCollege),
        });
      }
    }
    // Fetch specific CSC turnout if the election is CSC-scoped for the student's college
    if (
      election.scopeType === PositionType.CSC &&
      election.college === studentCollege
    ) {
      const studentsInSpecificCollege = await prisma.student.count({
        where: { college: studentCollege },
      });
      const votesInSpecificCollege = await prisma.studentElectionVote.count({
        where: {
          electionId: electionId,
          student: { college: studentCollege },
        },
      });
      specificCscTurnout = {
        college: studentCollege,
        voted: votesInSpecificCollege,
        eligible: studentsInSpecificCollege,
        percentage: calculatePercentage(
          votesInSpecificCollege,
          studentsInSpecificCollege
        ),
      };
    }

    // 3. Partylist Results & Total Votes for each Partylist
    // We need candidates for their votesReceived to sum up partylist totals
    const partylistsWithCandidates = await prisma.partylist.findMany({
      where: { electionId: electionId },
      select: {
        id: true,
        name: true,
        acronym: true,
        logoUrl: true,
        type: true,
        college: true,
        candidates: {
          // Include candidates to sum their votes for partylist total
          select: { votesReceived: true },
        },
      },
    });

    const partylistResults = partylistsWithCandidates.map((pl) => {
      const totalVotes = pl.candidates.reduce(
        (sum, cand) => sum + cand.votesReceived,
        0
      );
      // Destructure to omit the 'candidates' array from the final output if not needed
      const { candidates, ...rest } = pl;
      return { ...rest, totalVotes };
    });

    // 4. Position Detailed Results with Candidates and Winners
    const positions = await prisma.position.findMany({
      where: { electionId: electionId },
      orderBy: { order: "asc" }, // Order positions by their defined display order
      select: {
        id: true,
        name: true,
        description: true, // Include description for possible future use
        type: true,
        college: true,
        order: true,
        maxVotesAllowed: true,
        minVotesRequired: true,
        candidates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true, // For full name display
            nickname: true,
            photoUrl: true,
            isIndependent: true,
            votesReceived: true,
            partylist: {
              // Only select relevant partylist fields for candidate display
              select: {
                id: true,
                name: true,
                acronym: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    const positionsResults = positions.map((pos) => {
      const candidatesWithWinnerFlag = determineWinners(
        pos.candidates,
        pos.maxVotesAllowed
      );
      const totalVotesCastForPosition = candidatesWithWinnerFlag.reduce(
        (sum, cand) => sum + cand.votesReceived,
        0
      );

      return {
        ...pos,
        candidates: candidatesWithWinnerFlag,
        totalVotesCastForPosition: totalVotesCastForPosition,
      };
    });

    // --- Final Response Structure ---
    return NextResponse.json(
      {
        election: election,
        turnout: {
          overall: {
            voted: totalVotedInElection,
            eligible: totalEligibleStudents,
            percentage: overallTurnoutPercentage,
          },
          colleges: uscTurnoutByCollege, // Contains turnout for all colleges (for USC view)
          specificCsc: specificCscTurnout, // Contains turnout for student's college (if CSC)
        },
        partylistResults: partylistResults,
        positionsResults: positionsResults, // Contains all positions with their candidates & winner flags
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching election results:", error);
    return NextResponse.json(
      { error: "Failed to fetch election results." },
      { status: 500 }
    );
  }
}
