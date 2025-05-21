// src/app/api/admin/elections/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Import the singleton instance
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path

// POST - Create a new election
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, description, startDate, endDate } = data; // No type or college needed here

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, startDate, endDate" },
        { status: 400 }
      );
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before end date." },
        { status: 400 }
      );
    }

    const election = await prisma.election.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "UPCOMING", // Default status
      },
    });
    return NextResponse.json(election, { status: 201 });
  } catch (error) {
    console.error("Error creating election:", error);
    return NextResponse.json(
      { error: "Failed to create election." },
      { status: 500 }
    );
  }
}

// GET - Fetch all elections (or filter later)
export async function GET(request) {
  const elections = await prisma.election.findMany({
    orderBy: { startDate: "desc" },
    include: { extensions: true }, // Include extensions for display
  });
  // You might still want to dynamically calculate status here for display
  const now = new Date();
  const processedElections = elections.map((election) => {
    let calculatedStatus = election.status;
    if (election.status === "UPCOMING" || election.status === "ONGOING") {
      const mainStartDate = new Date(election.startDate);
      let effectiveEndDate = new Date(election.endDate);

      // Consider extensions if any
      election.extensions.forEach((ext) => {
        if (new Date(ext.extendedEndDate) > effectiveEndDate) {
          // This logic is a bit complex for a simple status here.
          // Effective end date can vary per college.
          // For a general status, we might stick to the main dates.
        }
      });

      if (now >= mainStartDate && now <= effectiveEndDate) {
        // Using general effectiveEndDate for simplicity here
        calculatedStatus = "ONGOING";
      } else if (now < mainStartDate) {
        calculatedStatus = "UPCOMING";
      } else if (now > effectiveEndDate) {
        calculatedStatus = "ENDED";
      }
    }
    return { ...election, status: calculatedStatus };
  });

  return NextResponse.json(processedElections, { status: 200 });
}
