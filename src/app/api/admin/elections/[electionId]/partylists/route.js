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
      where: { id: electionId },
    });
    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    const data = await request.json();
    const { name, acronym, logoUrl, platform, type, college } = data; // 'type' and 'college' come from client

    // 1. Validate required fields & enums
    if (!name || !type) {
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
    // If type is CSC, college is required and must be a valid enum value
    if (
      type === PositionType.CSC &&
      (!college || !Object.values(College).includes(college))
    ) {
      return NextResponse.json(
        { error: "Valid college is required for CSC partylists." },
        { status: 400 }
      );
    }

    // 2. Determine the final college value to be saved based on role and type
    let collegeToSave = college; // Start with what client sent

    if (type === PositionType.USC) {
      collegeToSave = null; // USC partylists ALWAYS have null college
    }

    // --- SCOPE VALIDATION FOR MODERATOR ---
    if (session.user.role === "MODERATOR") {
      if (type === PositionType.USC) {
        // Moderator creating USC partylist
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
        // USC Mod creating USC partylist is fine, collegeToSave is already null.
      } else if (type === PositionType.CSC) {
        // Moderator creating CSC partylist
        if (session.user.college === null) {
          // USC Mod trying to create CSC partylist
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot create CSC partylists.",
            },
            { status: 403 }
          );
        }
        // College Mod creating CSC partylist: 'collegeToSave' must match their assigned college
        if (collegeToSave !== session.user.college) {
          return NextResponse.json(
            {
              error: `Forbidden: You can only create CSC partylists for your assigned college (${session.user.college}).`,
            },
            { status: 403 }
          );
        }
      }
    }

    // 4. Create the partylist in the database
    const newPartylist = await prisma.partylist.create({
      data: {
        name,
        acronym,
        logoUrl,
        platform,
        electionId: electionId,
        type: type, // The validated type from client
        college: collegeToSave, // The determined college (null for USC, specific college for CSC)
      },
    });
    return NextResponse.json(newPartylist, { status: 201 });
  } catch (error) {
    console.error(
      `Error creating partylist for election ${electionId}:`,
      error
    );
    if (error.code === "P2002" && error.meta?.target) {
      // error.meta.target should be an array like ['electionId', 'name', 'type', 'college']
      const targetFields = error.meta.target.join(", ");
      return NextResponse.json(
        {
          error: `A partylist with these details (${targetFields}) already exists for this election. Please use a different name, type, or college combination.`,
        },
        { status: 409 } // 409 Conflict
      );
    }
    return NextResponse.json(
      { error: `Failed to create partylist. ${error.message}` },
      { status: 500 }
    );
  }
}
