// src/app/api/admin/elections/[electionId]/partylists/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType, College } from "@prisma/client"; // Make sure these enums are imported

// GET - Fetch all partylists for a specific election (NO CHANGES NEEDED TO THIS FUNCTION)
export async function GET(request, context) {
  // ... your existing GET logic ...
  const params = await context.params;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
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

    // Fetch partylists, now they will include type and college
    const partylists = await prisma.partylist.findMany({
      where: { electionId: electionId },
      orderBy: [
        { type: "asc" }, // Optional: order by type then name
        { college: "asc" },
        { name: "asc" },
      ],
    });
    return NextResponse.json(partylists, { status: 200 });
  } catch (error) {
    console.error(
      `Error fetching partylists for election ${electionId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch partylists." },
      { status: 500 }
    );
  }
}

// POST - Create a new partylist for a specific election
export async function POST(request, context) {
  const params = await context.params;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    const election = await prisma.election.findUnique({
      // Ensure election exists
      where: { id: electionId },
    });
    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    const data = await request.json();
    // Destructure new fields: type and college
    const { name, acronym, logoUrl, platform, type, college } = data;

    // --- VALIDATE REQUIRED FIELDS & ENUMS ---
    if (!name || !type) {
      // Name and Type are essential for a partylist
      return NextResponse.json(
        { error: "Missing required fields: name, type." },
        { status: 400 }
      );
    }
    if (!Object.values(PositionType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid partylist type." },
        { status: 400 }
      );
    }
    if (
      type === PositionType.CSC &&
      (!college || !Object.values(College).includes(college))
    ) {
      return NextResponse.json(
        { error: "Valid college is required for CSC partylists." },
        { status: 400 }
      );
    }

    let finalCollege = college; // Variable to hold the college to be saved

    // --- SCOPE VALIDATION FOR MODERATOR ---
    if (session.user.role === "MODERATOR") {
      if (type === PositionType.USC) {
        if (session.user.college !== null) {
          // College Mod trying to create USC partylist
          return NextResponse.json(
            {
              error:
                "Forbidden: College moderators cannot create USC partylists.",
            },
            { status: 403 }
          );
        }
        finalCollege = null; // Ensure college is null for USC partylists created by USC Mod
      } else if (type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod trying to create CSC partylist
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot create CSC partylists.",
            },
            { status: 403 }
          );
        }
        if (finalCollege !== session.user.college) {
          // College Mod trying to create for wrong college
          return NextResponse.json(
            {
              error: `Forbidden: You can only create CSC partylists for your assigned college (${session.user.college}).`,
            },
            { status: 403 }
          );
        }
        // College Mod creating for their college - finalCollege is already set and validated
      }
    } else if (session.user.role === "SUPER_ADMIN") {
      if (type === PositionType.USC) {
        finalCollege = null; // Super Admin creating USC partylist, college must be null
      }
      // If type is CSC, 'college' from request body is used (already validated above)
    }

    const partylist = await prisma.partylist.create({
      data: {
        name,
        acronym,
        logoUrl,
        platform,
        electionId: electionId,
        type: type, // Save the type
        college: finalCollege, // Save the (potentially moderated) college
      },
    });
    return NextResponse.json(partylist, { status: 201 });
  } catch (error) {
    console.error(
      `Error creating partylist for election ${electionId}:`,
      error
    );
    // Update unique constraint error check if your @@unique now includes type/college
    // Prisma error P2002 for unique constraint violation
    // The target will be like ['electionId', 'name', 'type', 'college']
    if (error.code === "P2002" && error.meta?.target) {
      const targetFields = error.meta.target.join(", ");
      return NextResponse.json(
        {
          error: `A partylist with these details (${targetFields}) already exists for this election.`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create partylist." },
      { status: 500 }
    );
  }
}
