// src/app/api/student/active-election-details/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed
import { ElectionStatus, PositionType, College } from "@prisma/client";

// Helper: Get effective end date for a student in an election
function getEffectiveEndDate(election, studentCollege) {
  if (!election) return null;
  const mainEndDate = new Date(election.endDate);
  if (
    !studentCollege ||
    !election.extensions ||
    election.extensions.length === 0
  ) {
    return mainEndDate;
  }
  const collegeExtension = election.extensions.find(
    (ext) => ext.college === studentCollege
  );
  if (
    collegeExtension &&
    new Date(collegeExtension.extendedEndDate) > mainEndDate
  ) {
    return new Date(collegeExtension.extendedEndDate);
  }
  return mainEndDate;
}

// Helper: Get effective status for a student in an election
function getEffectiveStatus(election, studentCollege) {
  if (!election) return null;
  const now = new Date();
  const mainStartDate = new Date(election.startDate);
  const effectiveEndDate = getEffectiveEndDate(election, studentCollege);

  if (
    election.status === ElectionStatus.ENDED ||
    election.status === ElectionStatus.ARCHIVED
  ) {
    return election.status;
  }
  if (election.status === ElectionStatus.PAUSED) {
    return ElectionStatus.PAUSED;
  }

  if (now >= mainStartDate && now <= effectiveEndDate) {
    return ElectionStatus.ONGOING;
  } else if (now < mainStartDate) {
    return ElectionStatus.UPCOMING;
  } else {
    return ElectionStatus.ENDED; // Dynamically ended
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Forbidden: Student access only." },
      { status: 403 }
    );
  }

  const studentCollege = session.user.college; // e.g., 'CICT'

  try {
    // 1. Try to find an ONGOING election
    let relevantElections = await prisma.election.findMany({
      where: {
        status: ElectionStatus.ONGOING,
      },
      include: {
        extensions: true,
        // No need to include positions/partylists/candidates here yet,
        // just finding THE election first.
      },
      orderBy: {
        startDate: "desc", // If multiple somehow ONGOING, pick the one that started most recently
      },
    });

    let finalSelectedElection = null;

    if (relevantElections.length > 0) {
      // Filter these ONGOING elections by their *effective* status for the student
      const effectivelyOngoing = relevantElections.filter(
        (e) => getEffectiveStatus(e, studentCollege) === ElectionStatus.ONGOING
      );
      if (effectivelyOngoing.length > 0) {
        // If multiple are effectively ongoing for this student, pick one.
        // For example, the one ending soonest.
        effectivelyOngoing.sort(
          (a, b) =>
            getEffectiveEndDate(a, studentCollege).getTime() -
            getEffectiveEndDate(b, studentCollege).getTime()
        );
        finalSelectedElection = effectivelyOngoing[0];
      }
    }

    // 2. If no effectively ONGOING election, find the next UPCOMING one
    if (!finalSelectedElection) {
      relevantElections = await prisma.election.findMany({
        where: {
          status: ElectionStatus.UPCOMING,
          startDate: { gt: new Date() }, // Start date must be in the future
        },
        include: { extensions: true },
        orderBy: {
          startDate: "asc", // Earliest starting date first
        },
      });

      if (relevantElections.length > 0) {
        // Filter these UPCOMING elections by their *effective* status for the student
        const effectivelyUpcoming = relevantElections.filter(
          (e) =>
            getEffectiveStatus(e, studentCollege) === ElectionStatus.UPCOMING
        );
        if (effectivelyUpcoming.length > 0) {
          finalSelectedElection = effectivelyUpcoming[0]; // The soonest one
        }
      }
    }

    // 3. If still no election, maybe find the most recently ended one for historical context (optional)
    if (!finalSelectedElection) {
      relevantElections = await prisma.election.findMany({
        where: {
          // Consider PAUSED, ENDED. ARCHIVED usually hidden from students unless explicitly requested.
          status: { in: [ElectionStatus.ENDED, ElectionStatus.PAUSED] },
        },
        include: { extensions: true },
        orderBy: {
          endDate: "desc", // Most recently ended
        },
        take: 1,
      });
      if (relevantElections.length > 0) {
        finalSelectedElection = relevantElections[0];
      }
    }

    if (!finalSelectedElection) {
      return NextResponse.json(null, { status: 200 }); // No relevant election found
    }

    // 4. Now that we have the single relevant election, fetch all its associated details
    const electionDetails = await prisma.election.findUnique({
      where: { id: finalSelectedElection.id },
      include: {
        extensions: true,
        positions: {
          orderBy: { order: "asc" },
        },
        partylists: {
          orderBy: { name: "asc" },
        },
        candidates: {
          include: {
            position: true, // For candidate card display
            partylist: true, // For candidate card display
          },
          orderBy: [{ position: { order: "asc" } }, { lastName: "asc" }],
        },
      },
    });

    if (!electionDetails) {
      // Should not happen if finalSelectedElection was found
      return NextResponse.json(
        { error: "Failed to fetch details for the selected election." },
        { status: 500 }
      );
    }

    // Filter entities by scope for the student
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

    // Calculate the effective status and end date for the student for this specific election
    const effectiveStatusForStudent = getEffectiveStatus(
      electionDetails,
      studentCollege
    ); // Use original electionDetails here as it has extensions
    const effectiveEndDateForStudent = getEffectiveEndDate(
      electionDetails,
      studentCollege
    );

    return NextResponse.json(
      {
        id: electionDetails.id,
        name: electionDetails.name,
        description: electionDetails.description,
        startDate: electionDetails.startDate, // Original start date
        endDate: electionDetails.endDate, // Original general end date
        status: electionDetails.status, // Original DB status
        effectiveStatusForStudent: effectiveStatusForStudent,
        effectiveEndDateForStudent: effectiveEndDateForStudent.toISOString(), // Send effective end date as ISO string

        // Scoped entities
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
