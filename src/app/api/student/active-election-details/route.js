// src/app/api/student/active-election-details/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed
import { ElectionStatus, PositionType } from "@prisma/client";
import { getEffectiveStatus, getEffectiveEndDate } from "@/lib/electionUtils";

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

    // Fetch elections that are NOT explicitly ARCHIVED or PAUSED.
    // We'll determine their effective status (ONGOING, UPCOMING, ENDED) from their dates.
    const candidateElections = await prisma.election.findMany({
      where: {
        status: {
          notIn: [ElectionStatus.ARCHIVED, ElectionStatus.PAUSED],
        },
      },
      include: {
        extensions: true,
        // For this initial selection step, we only need extensions to calculate effective status/dates
      },
      // Order by start date to easily find the next upcoming if no ongoing is found
      orderBy: {
        startDate: "asc",
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
      if (status === ElectionStatus.ONGOING) {
        effectivelyOngoingElections.push(election);
      } else if (status === ElectionStatus.UPCOMING) {
        // Ensure UPCOMING means its actual startDate is in the future or very soon
        if (
          new Date(election.startDate) >= now ||
          getEffectiveEndDate(election, studentCollege) >= now
        ) {
          effectivelyUpcomingElections.push(election);
        } else {
          // It was marked UPCOMING in DB, but dates suggest it should have started and ended.
          // Treat as effectively ended for student view if getEffectiveStatus also says ENDED.
          if (status === ElectionStatus.ENDED) {
            effectivelyEndedElections.push(election);
          }
        }
      } else if (status === ElectionStatus.ENDED) {
        effectivelyEndedElections.push(election);
      }
    }

    let finalSelectedElection = null;

    if (effectivelyOngoingElections.length > 0) {
      // If multiple are effectively ongoing, pick the one ending soonest
      effectivelyOngoingElections.sort(
        (a, b) =>
          getEffectiveEndDate(a, studentCollege).getTime() -
          getEffectiveEndDate(b, studentCollege).getTime()
      );
      finalSelectedElection = effectivelyOngoingElections[0];
    } else if (effectivelyUpcomingElections.length > 0) {
      // effectivelyUpcomingElections is already sorted by startDate asc from the DB query
      finalSelectedElection = effectivelyUpcomingElections[0];
    } else if (effectivelyEndedElections.length > 0) {
      // Fallback: show the most recently effectively ended one
      effectivelyEndedElections.sort(
        (a, b) =>
          getEffectiveEndDate(b, studentCollege).getTime() -
          getEffectiveEndDate(a, studentCollege).getTime()
      );
      finalSelectedElection = effectivelyEndedElections[0];
    }

    if (!finalSelectedElection) {
      return NextResponse.json(null, { status: 200 });
    }

    // Now that we have the single relevant election, fetch all its associated details
    // (The rest of your data fetching and filtering logic from Step 4 onwards remains the same)
    const electionDetails = await prisma.election.findUnique({
      where: { id: finalSelectedElection.id },
      include: {
        /* ... your full include for positions, partylists, candidates ... */
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
