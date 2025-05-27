import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

// POST - Create a new election
export async function POST(request) {
  const session = await getServerSession(authOptions);
  let requestDataForLog; // Declare variable to store incoming data for error logging

  // Initial Forbidden Check
  if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
    await logAdminActivity({
      session: session, // Pass session directly, will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.ELECTION_CREATED,
      status: AuditLogStatus.FAILURE,
      details: {
        error:
          "Forbidden: Insufficient privileges (only SUPER_ADMIN can create elections).",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requestDataForLog = await request.json(); // Store incoming data
    const { name, description, startDate, endDate } = requestDataForLog; // Use stored data

    if (!name || !startDate || !endDate) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Missing required fields",
          providedData: requestDataForLog, // Use stored data for logging
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Missing required fields: name, startDate, endDate" },
        { status: 400 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    // Validate if parsed dates are valid Date objects
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Invalid date format for startDate or endDate",
          providedData: requestDataForLog, // Use stored data for logging
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Invalid date format for startDate or endDate." },
        { status: 400 }
      );
    }

    if (parsedStartDate >= parsedEndDate) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Start date must be before end date",
          providedData: requestDataForLog, // Use stored data for logging
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Start date must be before end date." },
        { status: 400 }
      );
    }

    const election = await prisma.election.create({
      data: {
        name,
        description,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        status: "UPCOMING", // Default status from your ElectionStatus enum
      },
    });

    // Log successful creation
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_CREATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Election",
      entityId: election.id,
      details: {
        name: election.name,
        startDate: election.startDate.toISOString(), // Log dates as ISO strings
        endDate: election.endDate.toISOString(),
        status: election.status,
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(election, { status: 201 });
  } catch (error) {
    console.error("Error creating election:", error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_CREATED,
      status: AuditLogStatus.FAILURE,
      details: {
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed", // Use stored requestDataForLog
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    if (error.code === "P2002") {
      // Unique constraint violation (e.g., if election name is unique)
      return NextResponse.json(
        { error: `An election with this name already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create election. Please check logs.` },
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
