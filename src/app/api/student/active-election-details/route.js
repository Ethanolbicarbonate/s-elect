import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ElectionStatus, PositionType } from "@prisma/client";
import { getEffectiveStatus, getEffectiveEndDate } from "@/lib/electionUtils";

const RECENTLY_ENDED_GRACE_PERIOD_DAYS = 7;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Forbidden: Student access only." },
      { status: 403 }
    );
  }
  const studentCollege = session.user.college;

  try {
    const now = new Date();
    const gracePeriodCutoff = new Date(now);
    gracePeriodCutoff.setDate(now.getDate() - RECENTLY_ENDED_GRACE_PERIOD_DAYS);

    // Fetch elections that might be relevant, including those that are ENDED/PAUSED
    // and have a recent enough end date (for grace period)
    const allCandidateElections = await prisma.election.findMany({
      where: {
        status: { notIn: [ElectionStatus.ARCHIVED] }, // Don't consider archived elections
        endDate: {
          // Elections whose end date is after the grace period cutoff
          // only fetch recent enough ENDED elections.
          gte: gracePeriodCutoff,
        },
      },
      include: {
        extensions: true,
      },
      orderBy: { startDate: "asc" }, // Order to ensure predictable primary selection
    });

    if (!allCandidateElections || allCandidateElections.length === 0) {
      return NextResponse.json(null, { status: 200 }); // No relevant election found
    }

    let effectivelyOngoingElections = [];
    let effectivelyUpcomingElections = [];
    let effectivelyPausedElections = []; // Added for clarity
    let recentlyEndedElections = [];

    for (const election of allCandidateElections) {
      const status = getEffectiveStatus(election, studentCollege);
      const effectiveEndDate = getEffectiveEndDate(election, studentCollege);

      // Ensure status and effectiveEndDate are valid before processing
      if (!status || !effectiveEndDate) {
        console.warn(
          `Skipping election ${election.id} due to invalid effective status (${status}) or end date (${effectiveEndDate}).`
        );
        continue; // Skip to next election
      }

      // Add effective status and end date to the election object for sorting
      const electionWithEffectiveProps = {
        ...election,
        effectiveStatus: status,
        effectiveEndDate: effectiveEndDate,
      };

      if (status === ElectionStatus.ONGOING) {
        effectivelyOngoingElections.push(electionWithEffectiveProps);
      } else if (status === ElectionStatus.UPCOMING) {
        // Only include upcoming if their start date is in the future.
        // This is implicitly handled by getEffectiveStatus, but double check.
        if (new Date(election.startDate) > now) {
          // Only truly upcoming
          effectivelyUpcomingElections.push(electionWithEffectiveProps);
        }
      } else if (status === ElectionStatus.PAUSED) {
        effectivelyPausedElections.push(electionWithEffectiveProps);
      } else if (status === ElectionStatus.ENDED) {
        // Elections whose status is ENDED, and are within the grace period (already filtered by initial query)
        // No need for effectiveEndDate < now here, because an admin can set ENDED status even if date is future.
        if (effectiveEndDate >= gracePeriodCutoff) {
          // Ensure it's still recently ended
          recentlyEndedElections.push(electionWithEffectiveProps);
        }
      }
      // If status is ARCHIVED, it's filtered out by the initial `where` clause.
    }

    let finalSelectedElection = null;

    // Prioritize elections for display:
    // 1. Ongoing (soonest ending)
    // 2. Upcoming (soonest starting)
    // 3. Paused (any)
    // 4. Recently Ended (most recent)

    if (effectivelyOngoingElections.length > 0) {
      effectivelyOngoingElections.sort(
        (a, b) => a.effectiveEndDate.getTime() - b.effectiveEndDate.getTime()
      );
      finalSelectedElection = effectivelyOngoingElections[0];
    } else if (effectivelyUpcomingElections.length > 0) {
      effectivelyUpcomingElections.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      finalSelectedElection = effectivelyUpcomingElections[0];
    } else if (effectivelyPausedElections.length > 0) {
      // NEW: Handle PAUSED elections
      // You might want a specific sort for paused elections, e.g., soonest to unpause, or just pick first.
      finalSelectedElection = effectivelyPausedElections[0];
    } else if (recentlyEndedElections.length > 0) {
      recentlyEndedElections.sort(
        (a, b) => b.effectiveEndDate.getTime() - a.effectiveEndDate.getTime()
      );
      finalSelectedElection = recentlyEndedElections[0];
    }

    if (!finalSelectedElection) {
      return NextResponse.json(null, { status: 200 }); // No relevant election found for display
    }

    // Now, fetch full details for the determined primary election
    const electionDetails = await prisma.election.findUnique({
      where: { id: finalSelectedElection.id },
      include: {
        extensions: true,
        positions: { orderBy: { order: "asc" } },
        partylists: {
          orderBy: [{ type: "asc" }, { college: "asc" }, { name: "asc" }],
        },
        candidates: {
          include: { position: true, partylist: true },
          orderBy: [{ position: { order: "asc" } }, { lastName: "asc" }],
        },
        StudentElectionVote: {
          // Include to check if student has voted in this election
          where: { studentId: session.user.id },
        },
      },
    });

    if (!electionDetails) {
      return NextResponse.json(
        { error: "Failed to fetch details for the selected election." },
        { status: 500 }
      );
    }

    // Re-calculate effective status and end date for the final object being sent to frontend
    // This is important because `electionDetails` is the full object that went through Prisma,
    // ensuring all relations are loaded if needed for effective status calculation.
    const finalEffectiveStatusForStudent = getEffectiveStatus(
      electionDetails,
      studentCollege
    );
    const finalEffectiveEndDateForStudent = getEffectiveEndDate(
      electionDetails,
      studentCollege
    );

    // Defensive check (should be okay with the revised logic, but good as a fallback)
    if (!finalEffectiveStatusForStudent || !finalEffectiveEndDateForStudent) {
      console.error(
        `CRITICAL: finalEffectiveStatusForStudent or finalEffectiveEndDateForStudent is null for election ${electionDetails.id} after re-fetch. This indicates a deeper data or logic flaw.`
      );
      return NextResponse.json(
        { error: "Could not process election dates. Data might be invalid." },
        { status: 500 }
      );
    }

    // Check if the current student has voted in this specific election
    const hasStudentVoted = electionDetails.StudentElectionVote.length > 0;

    // --- Prepare final response ---
    return NextResponse.json(
      {
        // Core election details
        id: electionDetails.id,
        name: electionDetails.name,
        description: electionDetails.description,
        startDate: electionDetails.startDate,
        endDate: electionDetails.endDate,
        status: electionDetails.status, // DB status

        // Calculated effective status and end date for student view
        effectiveStatusForStudent: finalEffectiveStatusForStudent,
        effectiveEndDateForStudent:
          finalEffectiveEndDateForStudent.toISOString(),

        // Data for widgets (filtered by student's college if CSC)
        // These are full arrays; client components will filter further for specific tabs
        uscPositions: electionDetails.positions.filter(
          (p) => p.type === PositionType.USC
        ),
        cscPositions: electionDetails.positions.filter(
          (p) => p.type === PositionType.CSC && p.college === studentCollege
        ),
        uscPartylists: electionDetails.partylists.filter(
          (p) => p.type === PositionType.USC
        ),
        cscPartylists: electionDetails.partylists.filter(
          (p) => p.type === PositionType.CSC && p.college === studentCollege
        ),
        uscCandidates: electionDetails.candidates.filter(
          (c) => c.position.type === PositionType.USC
        ),
        cscCandidates: electionDetails.candidates.filter(
          (c) =>
            c.position.type === PositionType.CSC &&
            c.position.college === studentCollege
        ),

        // New property for VoterStatusWidget
        hasVoted: hasStudentVoted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching active election for student:", error);
    return NextResponse.json(
      { error: "Failed to retrieve election data." },
      { status: 500 }
    );
  }
}
