// src/app/api/admin/elections/[electionId]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma"; // Using the singleton instance

// GET a specific election (already good to have)
export async function GET(request, context) {
  const { params } = await context;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user?.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        _count: {
          select: {
            positions: true,
            partylists: true,
            candidates: true,
            // Add other relations if they exist and matter for deletion, e.g., votes
          },
        },
        extensions: true, // Keep existing includes like extensions
      },
    });
    if (!election) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(election, { status: 200 });
  } catch (error) {
    console.error(`Error fetching election ${electionId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch election" },
      { status: 500 }
    );
  }
}

// PUT - Update an election (can be used for extending endDate, changing status, etc.)
export async function PUT(request, context) {
  const { params } = await context;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, description, startDate, endDate, status } = data; // These are general updates

    const currentElection = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!currentElection)
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) {
      const newStartDate = new Date(startDate);
      if (
        endDate &&
        newStartDate >= new Date(endDate || currentElection.endDate)
      ) {
        return NextResponse.json(
          { error: "Start date must be before end date." },
          { status: 400 }
        );
      }
      if (!endDate && newStartDate >= new Date(currentElection.endDate)) {
        return NextResponse.json(
          {
            error:
              "Start date must be before current end date if end date is not being updated.",
          },
          { status: 400 }
        );
      }
      updateData.startDate = newStartDate;
    }
    if (endDate !== undefined) {
      const newEndDate = new Date(endDate);
      if (newEndDate <= new Date(startDate || currentElection.startDate)) {
        return NextResponse.json(
          { error: "End date must be after start date." },
          { status: 400 }
        );
      }
      updateData.endDate = newEndDate;
    }
    if (status !== undefined) updateData.status = status;

    const updatedElection = await prisma.election.update({
      where: { id: electionId },
      data: updateData,
    });
    return NextResponse.json(updatedElection, { status: 200 });
  } catch (error) {
    // ... error handling ...
  }
}

export async function DELETE(request, context) {
  const { params } = await context;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only Super Admins can delete elections." },
      { status: 403 }
    );
  }

  try {
    // Prisma will handle cascading deletes if your schema is set up with onDelete: Cascade
    // For relations like Position, Partylist, Candidate to Election.
    // If not, you'd have to delete them manually in a transaction.
    // Assuming onDelete: Cascade is set for these relations on the Election model.

    // Optional: Double-check if any votes exist if votes are not directly cascaded
    // and you want to prevent deletion if votes are cast.

    const deletedElection = await prisma.election.delete({
      where: { id: electionId },
    });

    // If delete is successful but returns nothing, send 204
    // If it returns the deleted object (depends on Prisma version/config), send 200
    return NextResponse.json(
      {
        message: `Election '${deletedElection.name}' and its related data deleted successfully.`,
      },
      { status: 200 }
    );
    // return new NextResponse(null, { status: 204 }); // Alternative for no content
  } catch (error) {
    console.error(`Error deleting election ${electionId}:`, error);
    if (error.code === "P2025") {
      // Record to delete not found
      return NextResponse.json(
        { error: "Election not found to delete." },
        { status: 404 }
      );
    }
    // Handle other potential errors, e.g., P2003 foreign key constraint if cascades are not set up
    // and there are still related records in other tables.
    return NextResponse.json(
      {
        error:
          "Failed to delete election. Ensure all related entities that do not cascade are removed.",
      },
      { status: 500 }
    );
  }
}
