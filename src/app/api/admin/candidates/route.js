// src/app/api/admin/candidates/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { College, PositionType } from "@prisma/client";

// GET - Fetch candidates, with potential filters (electionId, positionId, college, partylistId)
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("electionId");
  const positionId = searchParams.get("positionId");
  const collegeScope = searchParams.get("college"); // For filtering CSC candidates by college
  const partylistId = searchParams.get("partylistId");
  const candidateScope = searchParams.get("scope"); // 'usc' or 'csc'

  const whereClause = {};
  if (electionId) whereClause.electionId = electionId;
  if (positionId) whereClause.positionId = positionId;
  if (partylistId) whereClause.partylistId = partylistId;

  // Scoping for moderators
  if (session.user.role === "MODERATOR") {
    if (session.user.college) {
      // College Moderator
      // They can only see candidates for their college's CSC positions or USC positions
      // This requires fetching positions first or a more complex query.
      // For simplicity now, if 'collegeScope' is provided and matches, allow.
      // Or, if 'scope=csc' and 'college=THEIR_COLLEGE'
      if (candidateScope === "csc" && collegeScope === session.user.college) {
        // Ensure we are fetching candidates whose position is of type CSC and matches the college
        whereClause.position = {
          type: PositionType.CSC,
          college: session.user.college,
        };
      } else if (candidateScope === "usc") {
        whereClause.position = {
          type: PositionType.USC,
        };
      } else if (collegeScope && collegeScope !== session.user.college) {
        // Moderator trying to access candidates outside their college scope for CSC
        return NextResponse.json(
          { error: "Forbidden: Access to this college scope is restricted." },
          { status: 403 }
        );
      } else if (!candidateScope && !collegeScope) {
        // If no scope, a college mod by default might see their college's candidates
        whereClause.position = {
          college: session.user.college, // Show their CSC candidates by default
        };
      }
    } else {
      // USC Moderator (college is null)
      // Can only see candidates for USC positions
      whereClause.position = { type: PositionType.USC };
    }
  }
  // SuperAdmin and Auditor can see all if no specific filters are applied by them.

  try {
    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        position: true, // Include position details
        partylist: true, // Include partylist details
        // student: true, // Include student details if linked
      },
      orderBy: [
        { position: { order: "asc" } }, // Order by position's order
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });
    return NextResponse.json(candidates, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates." },
      { status: 500 }
    );
  }
}

// POST - Create a new candidate
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const {
      firstName,
      lastName,
      middleName,
      nickname,
      photoUrl,
      bio,
      platformPoints,
      isIndependent,
      electionId,
      positionId,
      partylistId,
    } = data;

    if (!firstName || !lastName || !electionId || !positionId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: firstName, lastName, electionId, positionId.",
        },
        { status: 400 }
      );
    }
    if (!isIndependent && !partylistId) {
      return NextResponse.json(
        { error: "Partylist ID is required if candidate is not independent." },
        { status: 400 }
      );
    }
    if (isIndependent && partylistId) {
      return NextResponse.json(
        { error: "Independent candidate cannot be assigned to a partylist." },
        { status: 400 }
      );
    }

    // Validate election and position exist
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election)
      return NextResponse.json(
        { error: "Selected election not found." },
        { status: 404 }
      );

    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });
    if (!position || position.electionId !== electionId) {
      return NextResponse.json(
        {
          error:
            "Selected position not found or does not belong to this election.",
        },
        { status: 404 }
      );
    }

    if (election.scopeType === "USC" && position.type === "CSC") {
      return NextResponse.json(
        {
          error:
            "Cannot add candidate to a CSC position within a USC-scoped election.",
        },
        { status: 400 }
      );
    }

    // Authorization: Check if moderator is allowed to add to this position
    if (session.user.role === "MODERATOR") {
      if (position.type === PositionType.USC && session.user.college !== null) {
        // College mod trying to add to USC
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot add candidates to USC positions.",
          },
          { status: 403 }
        );
      }
      if (position.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC mod trying to add to CSC
          return NextResponse.json(
            {
              error:
                "Forbidden: USC moderators cannot add candidates to CSC positions.",
            },
            { status: 403 }
          );
        }
        if (position.college !== session.user.college) {
          // College mod trying to add to another college's CSC
          return NextResponse.json(
            {
              error:
                "Forbidden: Cannot add candidates to a different college's CSC position.",
            },
            { status: 403 }
          );
        }
      }
    }

    // Business Logic: Max 1 candidate per partylist per position (except for Councilor types)
    // This check is complex if "Councilor" names vary. Assuming specific position names for now.
    const nonMultipleCandidatePositions = [
      "CHAIRPERSON",
      "VICE CHAIRPERSON",
      "SECRETARY",
      "ASST SECRETARY",
      "TREASURER",
      "ASST TREASURER",
      "AUDITOR",
      "ASST AUDITOR",
      "BUSINESS MANAGER",
      "ASST. BUSINESS MANAGER",
      "PUBLIC INFORMATION OFFICER",
      "ASST. PUBLIC INFORMATION OFFICER",
    ];
    // Or better: Check against position.maxVotesAllowed === 1 (if this accurately reflects single-candidate-per-party rule)

    if (!isIndependent && partylistId && position.maxVotesAllowed === 1) {
      // Or check against nonMultipleCandidatePositions.includes(position.name.toUpperCase())
      const existingCandidate = await prisma.candidate.findFirst({
        where: {
          electionId,
          positionId,
          partylistId,
          id: { not: undefined }, // Placeholder to ensure it's an actual candidate
        },
      });
      if (existingCandidate) {
        return NextResponse.json(
          {
            error: `This partylist already has a candidate for the position of ${position.name}.`,
          },
          { status: 409 }
        );
      }
    }

    const candidate = await prisma.candidate.create({
      data: {
        firstName,
        lastName,
        middleName,
        nickname,
        photoUrl,
        bio,
        platformPoints: Array.isArray(platformPoints)
          ? platformPoints
          : platformPoints
          ? [platformPoints]
          : [],
        isIndependent: isIndependent || false,
        electionId,
        positionId,
        partylistId: isIndependent ? null : partylistId,
      },
    });
    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    // Add specific error handling for unique constraints if needed
    return NextResponse.json(
      { error: "Failed to create candidate." },
      { status: 500 }
    );
  }
}
