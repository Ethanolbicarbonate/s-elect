// src/app/api/admin/elections/[electionId]/positions/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust this path if necessary
import { PositionType, College } from "@prisma/client"; // Import enums for validation

// GET - Fetch all positions for a specific election
export async function GET(request, context) {
  const params = await context.params;
  const { electionId } = params;
  const session = await getServerSession(authOptions);
  // Allow SUPER_ADMIN, MODERATOR, AUDITOR to view positions
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Validate electionId presence (params should always provide it if route matches)
    if (!electionId) {
      return NextResponse.json(
        { error: "Election ID is missing from parameters." },
        { status: 400 }
      );
    }
    const electionExists = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!electionExists) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    const positions = await prisma.position.findMany({
      where: { electionId: electionId },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(positions, { status: 200 });
  } catch (error) {
    console.error(
      `Error fetching positions for election ${electionId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch positions." },
      { status: 500 }
    );
  }
}

// POST - Create a new position for a specific election
export async function POST(request, context) {
  const params = await context.params;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  // MODIFIED AUTHORIZATION CHECK
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // --- FIX: Fetch the election object ---
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }
    // --- END FIX ---

    const data = await request.json();
    const {
      name,
      description,
      type, // This is the PROPOSED type for the new position
      college, // This is the PROPOSED college for the new position
      maxVotesAllowed,
      minVotesRequired,
      order,
    } = data;

    if (
      !name ||
      !type ||
      maxVotesAllowed === undefined ||
      order === undefined
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, type, maxVotesAllowed, order.",
        },
        { status: 400 }
      );
    }

    // Validate type
    if (!Object.values(PositionType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid position type." },
        { status: 400 }
      );
    }

    if (session.user.role === "MODERATOR") {
      if (data.type === PositionType.USC) {
        if (session.user.college !== null) {
          return NextResponse.json(
            {
              error:
                "Forbidden: College moderators cannot create USC positions.",
            },
            { status: 403 }
          );
        }
        data.college = null;
      } else if (data.type === PositionType.CSC) {
        if (session.user.college === null) {
          return NextResponse.json(
            { error: "Forbidden: USC moderators cannot create CSC positions." },
            { status: 403 }
          );
        }
        if (!data.college || data.college !== session.user.college) {
          return NextResponse.json(
            {
              error: `Forbidden: You can only create CSC positions for your assigned college (${session.user.college}).`,
            },
            { status: 403 }
          );
        }
      }
    } else {
      // SUPER_ADMIN
      if (data.type === PositionType.USC) {
        data.college = null;
      } else if (data.type === PositionType.CSC && !data.college) {
        return NextResponse.json(
          { error: "College is required for CSC positions." },
          { status: 400 }
        );
      }
    }

    // --- ADDED CHECKS AGAINST ELECTION'S SCOPE ---
    // These checks use the 'election' object fetched above
    if (election.scopeType) {
      // Only check if the election itself has a defined scope
      if (election.scopeType === "USC" && data.type === PositionType.CSC) {
        return NextResponse.json(
          {
            error: "Cannot create a CSC position within a USC-scoped election.",
          },
          { status: 400 }
        );
      }
      if (election.scopeType === "CSC" && data.type === PositionType.USC) {
        return NextResponse.json(
          {
            error: "Cannot create a USC position within a CSC-scoped election.",
          },
          { status: 400 }
        );
      }
      if (
        election.scopeType === "CSC" &&
        election.college &&
        data.type === PositionType.CSC &&
        data.college !== election.college
      ) {
        return NextResponse.json(
          {
            error: `Cannot create a position for college '${data.college}' within an election scoped to college '${election.college}'.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate college if type is CSC
    if (type === PositionType.CSC) {
      if (!college || !Object.values(College).includes(college)) {
        return NextResponse.json(
          { error: "Valid college is required for CSC positions." },
          { status: 400 }
        );
      }
    } else if (type === PositionType.USC && college) {
      // Ensure college is null for USC positions
      // This check can be done here, or just ensure the data sent for USC has college as null/undefined.
      // For now, we'll rely on frontend to send null, or Prisma will error if it's an invalid enum.
      // It's better to explicitly nullify it if type is USC.
      data.college = null;
    }

    if (parseInt(maxVotesAllowed) < 1) {
      return NextResponse.json(
        { error: "Max votes allowed must be at least 1." },
        { status: 400 }
      );
    }
    if (minVotesRequired !== undefined && parseInt(minVotesRequired) < 0) {
      return NextResponse.json(
        { error: "Min votes required cannot be negative." },
        { status: 400 }
      );
    }
    if (
      minVotesRequired !== undefined &&
      parseInt(minVotesRequired) > parseInt(maxVotesAllowed)
    ) {
      return NextResponse.json(
        { error: "Min votes required cannot exceed max votes allowed." },
        { status: 400 }
      );
    }

    const electionExists = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!electionExists) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    if (election.scopeType === "USC" && data.type === "CSC") {
      return NextResponse.json(
        { error: "Cannot create a CSC position within a USC-scoped election." },
        { status: 400 }
      );
    }
    if (election.scopeType === "CSC" && data.type === "USC") {
      return NextResponse.json(
        { error: "Cannot create a USC position within a CSC-scoped election." },
        { status: 400 }
      );
    }
    if (
      election.scopeType === "CSC" &&
      election.college &&
      data.type === "CSC" &&
      data.college !== election.college
    ) {
      return NextResponse.json(
        {
          error: `Cannot create a position for college '${data.college}' within an election scoped to college '${election.college}'.`,
        },
        { status: 400 }
      );
    }

    const newPosition = await prisma.position.create({
      data: {
        // ... other fields ...
        name: data.name,
        description: data.description,
        type: data.type,
        college: data.college, // Use the potentially modified data.college
        maxVotesAllowed: parseInt(data.maxVotesAllowed),
        minVotesRequired:
          data.minVotesRequired !== undefined
            ? parseInt(data.minVotesRequired)
            : 0,
        order: parseInt(data.order),
        electionId: electionId,
      },
    });
    return NextResponse.json(newPosition, { status: 201 });
  } catch (error) {
    console.error(`Error creating position for election ${electionId}:`, error);
    if (error.code === "P2002") {
      // Unique constraint violation
      return NextResponse.json(
        {
          error:
            "A position with this name (and college, if CSC) already exists for this election.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create position." },
      { status: 500 }
    );
  }
}
