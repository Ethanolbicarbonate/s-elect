// src/app/api/student/active-election-details/route.js
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

    const candidateElections = await prisma.election.findMany({
      where: {
        status: {
          notIn: [ElectionStatus.ARCHIVED],
        },
        endDate: {
          gte: new Date(
            new Date().setDate(
              now.getDate() - (RECENTLY_ENDED_GRACE_PERIOD_DAYS + 30)
            )
          ),
        },
      },
      include: {
        extensions: true,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    if (!candidateElections || candidateElections.length === 0) {
      return NextResponse.json(null, { status: 200 });
    }

    // --- FIX: Declare these arrays OUTSIDE the loop ---
    let effectivelyOngoingElections = [];
    let effectivelyUpcomingElections = [];
    let recentlyEndedElections = [];
    // --- END FIX ---

    for (const election of candidateElections) {
      const status = getEffectiveStatus(election, studentCollege);
      const effectiveEndDate = getEffectiveEndDate(election, studentCollege);

      // --- ADDED DEFENSIVE CHECK FOR EFFECTIVE DATES (if it's still possible for them to be null) ---
      // This is a belt-and-suspenders approach, as getEffectiveEndDate should return a valid Date or null
      // and we handle the null cases at the end of the loop where finalSelectedElection is used.
      if (!effectiveEndDate || !status) {
        console.warn(
          `Skipping election ${election.id} due to invalid effective status or end date.`
        );
        continue; // Skip to next election if status/date cannot be reliably determined
      }
      // --- END DEFENSIVE CHECK ---

      if (status === ElectionStatus.ONGOING) {
        effectivelyOngoingElections.push(election);
      } else if (status === ElectionStatus.UPCOMING) {
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
          recentlyEndedElections.push({
            ...election,
            calculatedStatusForSort: ElectionStatus.ENDED,
          });
        }
      } else if (
        status === ElectionStatus.ENDED ||
        status === ElectionStatus.PAUSED
      ) {
        if (effectiveEndDate >= gracePeriodCutoff && effectiveEndDate < now) {
          recentlyEndedElections.push({
            ...election,
            calculatedStatusForSort: status,
          });
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
      finalSelectedElection = effectivelyUpcomingElections[0];
    } else if (recentlyEndedElections.length > 0) {
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
      },
    });

    if (!electionDetails) {
      return NextResponse.json(
        { error: "Failed to fetch details for the selected election." },
        { status: 500 }
      );
    }

    const effectiveStatusForStudent = getEffectiveStatus(
      electionDetails,
      studentCollege
    );
    const effectiveEndDateForStudent = getEffectiveEndDate(
      electionDetails,
      studentCollege
    );

    // --- Defensive check from last time, should be okay now with valid dates ---
    if (!effectiveStatusForStudent || !effectiveEndDateForStudent) {
      console.error(
        `CRITICAL: effectiveStatusForStudent or effectiveEndDateForStudent is null for election ${electionDetails.id} after re-fetch. This indicates a deeper data or logic flaw.`
      );
      return NextResponse.json(
        { error: "Could not process election dates. Data might be invalid." },
        { status: 500 }
      );
    }
    // --- End Defensive check ---

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
        status: electionDetails.status,
        effectiveStatusForStudent: effectiveStatusForStudent,
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
