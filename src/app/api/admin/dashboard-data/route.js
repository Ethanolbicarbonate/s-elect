// src/app/api/admin/dashboard-data/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ElectionStatus, PositionType, College } from "@prisma/client";
import { getEffectiveStatus, getEffectiveEndDate } from "@/lib/electionUtils"; // Re-use helpers

// --- Helper Functions (More robust, copied from election-results.js) ---
function calculatePercentage(voted, total) {
  if (total === 0) return 0;
  return (voted / total) * 100;
}

// Helper to determine winners for a position (Robust version)
function determineWinners(candidates, maxVotesAllowed) {
  if (!candidates || candidates.length === 0) {
    return candidates.map((cand) => ({ ...cand, isWinner: false }));
  }

  // Sort candidates by votesReceived in descending order
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
        winnersSet.add(sorted[i].id);
      } else {
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

const ADMIN_RESULTS_GRACE_PERIOD_DAYS = 30;

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  const userRole = session.user.role;
  const userCollege = session.user.college; // null for USC mod or SA

  try {
    const now = new Date();
    const gracePeriodCutoff = new Date(now);
    gracePeriodCutoff.setDate(now.getDate() - ADMIN_RESULTS_GRACE_PERIOD_DAYS);

    // Filter elections based on admin's scope early
    const electionWhereClause = {
      status: { not: ElectionStatus.ARCHIVED },
      endDate: { gte: gracePeriodCutoff },
    };

    // If moderator, ensure we only fetch elections that contain positions relevant to their college.
    // This requires a more complex query if Election model doesn't have direct scope.
    // Assuming here that a moderator's college implies the scope for elections they manage.
    // A more robust way would be to query for elections with at least one position matching their scope.
    // For now, we'll fetch all and filter post-query for primary election logic,
    // but the `fullElectionDetails` query will already filter its associated data.
    // The most accurate way is to check `election.scopeType` and `election.college` directly on the election model.
    // For this to work, your Election model needs `scopeType` and `college` fields.
    // If Election model has `scopeType: PositionType?` and `college: College?`:
    /*
    if (userRole === "MODERATOR") {
        if (userCollege) { // CSC Moderator
            electionWhereClause.scopeType = PositionType.CSC;
            electionWhereClause.college = userCollege;
        } else { // USC Moderator
            electionWhereClause.scopeType = PositionType.USC;
            electionWhereClause.college = null;
        }
    }
    */
    // Since your existing fullElectionDetails query does filter positions/candidates/partylists,
    // we'll rely on that for data scoping for the primary election.
    // The `allElections` here is mostly to find the `primaryElection`.

    const allElections = await prisma.election.findMany({
      where: electionWhereClause, // Apply general filters
      include: {
        extensions: true,
        // Include positions for filtering primaryElection for moderators
        positions: {
          select: { id: true, type: true, college: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    let primaryElection = null;
    let relevantOngoingElections = [];
    let relevantUpcomingElections = [];
    let relevantPausedElections = [];
    let relevantRecentlyEndedElections = [];

    // Filter relevant elections based on moderator scope before categorizing
    const filteredElectionsByModeratorScope = allElections.filter(
      (election) => {
        if (userRole === "SUPER_ADMIN" || userRole === "AUDITOR") {
          return true; // SA/Auditor sees all relevant elections
        } else if (userRole === "MODERATOR") {
          // A moderator should only see elections where they have associated positions.
          // Check if any position within the election matches the moderator's scope.
          const hasRelevantPosition = election.positions.some((pos) => {
            if (userCollege) {
              // College Moderator (CSC)
              return (
                pos.type === PositionType.CSC && pos.college === userCollege
              );
            } else {
              // USC Moderator
              return pos.type === PositionType.USC;
            }
          });
          return hasRelevantPosition;
        }
        return false; // Should not happen
      }
    );

    // Categorize relevant elections by their effective status
    for (const election of filteredElectionsByModeratorScope) {
      const effectiveStatus = getEffectiveStatus(election, userCollege); // Use userCollege for scope
      const effectiveEndDate = getEffectiveEndDate(election, userCollege);

      if (effectiveStatus === ElectionStatus.ONGOING) {
        relevantOngoingElections.push({
          ...election,
          effectiveStatus,
          effectiveEndDate,
        });
      } else if (effectiveStatus === ElectionStatus.UPCOMING) {
        relevantUpcomingElections.push({
          ...election,
          effectiveStatus,
          effectiveEndDate,
        });
      } else if (effectiveStatus === ElectionStatus.ENDED) {
        if (effectiveEndDate >= gracePeriodCutoff) {
          relevantRecentlyEndedElections.push({
            ...election,
            effectiveStatus,
            effectiveEndDate,
          });
        }
      } else if (effectiveStatus === ElectionStatus.PAUSED) {
        relevantPausedElections.push({
          ...election,
          effectiveStatus,
          effectiveEndDate,
        });
      }
    }

    // Determine the single primary election for the dashboard
    if (relevantOngoingElections.length > 0) {
      relevantOngoingElections.sort(
        (a, b) => a.effectiveEndDate.getTime() - b.effectiveEndDate.getTime()
      );
      primaryElection = relevantOngoingElections[0]; // Soonest ending ongoing
    } else if (relevantUpcomingElections.length > 0) {
      relevantUpcomingElections.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      primaryElection = relevantUpcomingElections[0]; // Soonest starting upcoming
    } else if (relevantPausedElections.length > 0) {
      primaryElection = relevantPausedElections[0]; // Pick any paused election if no ongoing/upcoming
    } else if (relevantRecentlyEndedElections.length > 0) {
      relevantRecentlyEndedElections.sort(
        (a, b) => b.effectiveEndDate.getTime() - a.effectiveEndDate.getTime()
      );
      primaryElection = relevantRecentlyEndedElections[0]; // Most recently ended
    }

    if (!primaryElection) {
      return NextResponse.json(
        { activeElectionDetails: null },
        { status: 200 }
      ); // Return null for `activeElectionDetails`
    }

    // 2. Fetch full details for the primary election (already determined to be relevant to scope)
    const fullElectionDetails = await prisma.election.findUnique({
      where: { id: primaryElection.id },
      include: {
        extensions: true,
        positions: {
          // Filter positions by user's actual scope
          where:
            userRole === "MODERATOR"
              ? {
                  type: userCollege ? PositionType.CSC : PositionType.USC,
                  ...(userCollege && { college: userCollege }),
                }
              : {}, // SA/Auditor gets all positions in the election
          orderBy: { order: "asc" },
        },
        candidates: {
          // Filter candidates by user's actual scope
          where:
            userRole === "MODERATOR"
              ? {
                  position: {
                    // Join to position to filter
                    type: userCollege ? PositionType.CSC : PositionType.USC,
                    ...(userCollege && { college: userCollege }),
                  },
                }
              : {},
          include: {
            position: true,
            partylist: true,
          },
          orderBy: [
            { position: { order: "asc" } }, // Sort by position order first
            { votesReceived: "desc" }, // Then by votes received
          ],
        },
        partylists: {
          // Filter partylists by user's actual scope
          where:
            userRole === "MODERATOR"
              ? {
                  type: userCollege ? PositionType.CSC : PositionType.USC,
                  ...(userCollege && { college: userCollege }),
                }
              : {},
          orderBy: { name: "asc" },
        },
        // Include StudentElectionVote for overall turnout calculation in scope
        StudentElectionVote: {
          where:
            userRole === "MODERATOR" && userCollege
              ? { student: { college: userCollege } } // Only votes from this college for CSC mod
              : {}, // All votes for SA/Auditor/USC mod
        },
      },
    });

    if (!fullElectionDetails) {
      return NextResponse.json(
        { error: "Failed to load election details for dashboard." },
        { status: 500 }
      );
    }

    const effectiveStatusForStudentView = getEffectiveStatus(
      fullElectionDetails,
      userCollege
    );
    const effectiveEndDateForStudentView = getEffectiveEndDate(
      fullElectionDetails,
      userCollege
    );

    // FIX: Add a direct fallback here for the status and end date to ensure they are never undefined/null
    const finalEffectiveStatus =
      effectiveStatusForStudentView || ElectionStatus.UNKNOWN; // Use an actual enum value or a string 'UNKNOWN'
    const finalEffectiveEndDate = effectiveEndDateForStudentView || new Date();
    // 3. Prepare data for response
    // Calculate eligibleVoters and votesCastInScope based on the admin's scope
    let eligibleVotersCount = 0;
    let votesCastInScopeCount = 0;

    if (userRole === "SUPER_ADMIN" || userRole === "AUDITOR") {
      // SA/Auditor: overall university eligible students
      eligibleVotersCount = await prisma.student.count();
      // SA/Auditor: All votes cast in this election
      votesCastInScopeCount = await prisma.studentElectionVote.count({
        where: { electionId: fullElectionDetails.id },
      });
    } else if (userRole === "MODERATOR") {
      if (userCollege) {
        // CSC Moderator: only students in their college
        eligibleVotersCount = await prisma.student.count({
          where: { college: userCollege },
        });
        // CSC Mod: only votes from students in their college for this election
        votesCastInScopeCount = await prisma.studentElectionVote.count({
          where: {
            electionId: fullElectionDetails.id,
            student: { college: userCollege },
          },
        });
      } else {
        // USC Moderator: all eligible students
        eligibleVotersCount = await prisma.student.count(); // All university students
        // USC Mod: all votes for USC positions in this election (assuming USC votes are global)
        // Or simply all votes in this election if they manage everything USC.
        // For simplicity, let's count all votes in the election for USC Mod too
        votesCastInScopeCount = await prisma.studentElectionVote.count({
          where: { electionId: fullElectionDetails.id },
        });
      }
    }

    const voterTurnoutData = {
      eligibleVoters: eligibleVotersCount,
      votesCastInScope: votesCastInScopeCount,
      turnoutPercentage: calculatePercentage(
        votesCastInScopeCount,
        eligibleVotersCount
      ),
    };

    // Aggregate results for electionResults if election is ongoing/ended
    const positionsResultsForWidgets = [];
    if (
      effectiveStatusForStudentView === ElectionStatus.ONGOING ||
      effectiveStatusForStudentView === ElectionStatus.ENDED
    ) {
      for (const position of fullElectionDetails.positions) {
        // Already scoped for moderator
        const candidatesForPosition = fullElectionDetails.candidates.filter(
          (c) => c.positionId === position.id
        );
        const totalVotesCastForPosition = candidatesForPosition.reduce(
          (sum, cand) => sum + cand.votesReceived,
          0
        );

        const candidatesWithWinnerFlag = determineWinners(
          candidatesForPosition, // Already sorted by votes in fullElectionDetails fetch
          position.maxVotesAllowed
        );

        const candidatesDataForWidget = candidatesWithWinnerFlag.map(
          (cand) => ({
            id: cand.id,
            firstName: cand.firstName,
            lastName: cand.lastName,
            nickname: cand.nickname,
            photoUrl: cand.photoUrl,
            partylist: cand.partylist
              ? {
                  id: cand.partylist.id,
                  name: cand.partylist.name,
                  acronym: cand.partylist.acronym,
                }
              : null,
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
            isWinner: cand.isWinner, // Use the flag directly from determineWinners
          })
        );

        positionsResultsForWidgets.push({
          id: position.id,
          name: position.name,
          type: position.type,
          college: position.college,
          order: position.order, // Ensure order is included for sorting in frontend
          maxVotesAllowed: position.maxVotesAllowed,
          totalVotesCastForPosition: totalVotesCastForPosition,
          candidates: candidatesDataForWidget,
          // Removed winnerCandidateIds from here as `isWinner` is on candidate object
        });
      }
      // Sort positions results by order for consistent display
      positionsResultsForWidgets.sort((a, b) => a.order - b.order);
    }

    // --- Final Response Structure ---
    return NextResponse.json(
      {
        activeElectionDetails: {
          id: fullElectionDetails.id,
          name: fullElectionDetails.name,
          description: fullElectionDetails.description,
          startDate: fullElectionDetails.startDate,
          endDate: fullElectionDetails.endDate,
          status: fullElectionDetails.status, // DB status
          // FIX: Provide default empty string for scope.type/college if they are null
          scope: {
            type: fullElectionDetails.scopeType || "", // Ensure it's never undefined/null
            college: fullElectionDetails.college || "", // Ensure it's never undefined/null
          },
          effectiveStatus: finalEffectiveStatus,
          effectiveEndDate: finalEffectiveEndDate,
          voterTurnout: voterTurnoutData,
          allPositions: fullElectionDetails.positions,
          allCandidates: fullElectionDetails.candidates,
          allPartylists: fullElectionDetails.partylists,
          electionResults: {
            isLive: finalEffectiveStatus === ElectionStatus.ONGOING,
            isPublished: finalEffectiveStatus === ElectionStatus.ENDED,
            positionsResults: positionsResultsForWidgets,
            partylistResults: fullElectionDetails.partylists
              .map((pl) => {
                /* ... */
              })
              .sort((a, b) => b.totalVotes - a.totalVotes),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to retrieve dashboard data." },
      { status: 500 }
    );
  }
}
