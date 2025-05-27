// src/app/api/student/active-election-details/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed
import { ElectionStatus, PositionType } from "@prisma/client";
import { getEffectiveStatus, getEffectiveEndDate } from "@/lib/electionUtils";

const RECENTLY_ENDED_GRACE_PERIOD_DAYS = 7; // Display ended elections for 7 days after they end

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

    // Fetch elections that are not ARCHIVED.
    // We will determine their effective status.
    const candidateElections = await prisma.election.findMany({
      where: {
        status: {
          notIn: [ElectionStatus.ARCHIVED], // Exclude ARCHIVED outright
        },
        // Optimization: Fetch elections whose end date (or potential extended end date)
        // isn't too far in the past beyond the grace period.
        // This is a rough filter; precise filtering happens with effectiveEndDate.
        endDate: {
          gte: new Date(
            new Date().setDate(
              now.getDate() - (RECENTLY_ENDED_GRACE_PERIOD_DAYS + 30)
            )
          ), // e.g., ended within last ~37 days
        },
      },
      include: {
        extensions: true,
      },
      orderBy: {
        startDate: "asc", // Useful for finding soonest upcoming
      },
    });

    if (!candidateElections || candidateElections.length === 0) {
      return NextResponse.json(null, { status: 200 }); // No suitable elections
    }

    let effectivelyOngoingElections = [];
    let effectivelyUpcomingElections = [];
    let effectivelyEndedElections = []; // For fallback

    for (const election of candidateElections) {
      const status = getEffectiveStatus(election, studentCollege);
      const effectiveEndDate = getEffectiveEndDate(election, studentCollege);

      if (status === ElectionStatus.ONGOING) {
        effectivelyOngoingElections.push(election);
      } else if (status === ElectionStatus.UPCOMING) {
        // Ensure UPCOMING means its actual startDate is in the future or today,
        // and its effective end date hasn't passed.
        if (
          new Date(election.startDate) >=
            new Date(new Date().setHours(0, 0, 0, 0)) &&
          effectiveEndDate >= now
        ) {
          effectivelyUpcomingElections.push(election);
        } else if (
          effectiveEndDate >= gracePeriodCutoff &&
          effectiveEndDate < now
        ) {
          // Was UPCOMING in DB, but dates make it recently ENDED
          recentlyEndedElections.push({
            ...election,
            calculatedStatusForSort: ElectionStatus.ENDED,
          });
        }
      } else if (
        status === ElectionStatus.ENDED ||
        status === ElectionStatus.PAUSED
      ) {
        // Check if it ended within the grace period
        if (effectiveEndDate >= gracePeriodCutoff && effectiveEndDate < now) {
          // Must have ended (endDate < now)
          recentlyEndedElections.push({
            ...election,
            calculatedStatusForSort: status,
          }); // Keep PAUSED if it was PAUSED
        }
      }
    }

    let finalSelectedElection = null;

    if (effectivelyOngoingElections.length > 0) {
      effectivelyOngoingElections.sort(
        (a, b) =>
          getEffectiveEndDate(a, studentCollege).getTime() -
          getEffectiveEndDate(b, studentCollege).getTime()
      );
      finalSelectedElection = effectivelyOngoingElections[0];
    } else if (effectivelyUpcomingElections.length > 0) {
      // Already sorted by startDate asc from DB query
      finalSelectedElection = effectivelyUpcomingElections[0];
    } else if (recentlyEndedElections.length > 0) {
      // If multiple recently ended, show the one that ended most recently
      recentlyEndedElections.sort(
        (a, b) =>
          getEffectiveEndDate(b, studentCollege).getTime() -
          getEffectiveEndDate(a, studentCollege).getTime()
      );
      finalSelectedElection = recentlyEndedElections[0];
    }

    if (!finalSelectedElection) {
      return NextResponse.json(null, { status: 200 });
    }

    // fetch all its associated details
    const electionDetails = await prisma.election.findUnique({
      where: { id: finalSelectedElection.id },
      include: {
        extensions: true,
        positions: { orderBy: { order: "asc" } },
        partylists: {
          orderBy: [{ type: "asc" }, { college: "asc" }, { name: "asc" }],
        }, // Updated order
        candidates: {
          include: { position: true, partylist: true },
          orderBy: [{ position: { order: "asc" } }, { lastName: "asc" }],
        },
      },
    });
    if (!electionDetails) {
      return NextResponse.json(
        { error: "Failed to fetch details for the selected election." },
        { status: 500 }
      );
    }

    // Recalculate effective status & end date based on the fully loaded electionDetails (with extensions)
    const effectiveStatusForStudent = getEffectiveStatus(
      electionDetails,
      studentCollege
    );
    const effectiveEndDateForStudent = getEffectiveEndDate(
      electionDetails,
      studentCollege
    );

    // Filter entities (USC/CSC)
    // ... (your existing filtering logic for uscPositions, cscPositions, etc.)
    const uscPositions = electionDetails.positions.filter(
      (p) => p.type === PositionType.USC
    );
    const cscPositions = electionDetails.positions.filter(
      (p) => p.type === PositionType.CSC && p.college === studentCollege
    );
    const uscPartylists = electionDetails.partylists.filter(
      (p) => p.type === PositionType.USC
    );
    const cscPartylists = electionDetails.partylists.filter(
      (p) => p.type === PositionType.CSC && p.college === studentCollege
    );
    const uscCandidates = electionDetails.candidates.filter(
      (c) => c.position.type === PositionType.USC
    );
    const cscCandidates = electionDetails.candidates.filter(
      (c) =>
        c.position.type === PositionType.CSC &&
        c.position.college === studentCollege
    );

    return NextResponse.json(
      {
        id: electionDetails.id,
        name: electionDetails.name,
        description: electionDetails.description,
        startDate: electionDetails.startDate,
        endDate: electionDetails.endDate,
        status: electionDetails.status, // Original DB status
        effectiveStatusForStudent: effectiveStatusForStudent, // The CRITICAL status for student view
        effectiveEndDateForStudent: effectiveEndDateForStudent.toISOString(),
        uscPositions,
        cscPositions,
        uscPartylists,
        cscPartylists,
        uscCandidates,
        cscCandidates,
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
