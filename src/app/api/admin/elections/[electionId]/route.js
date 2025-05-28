// src/app/api/admin/elections/[electionId]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma"; // Using the singleton instance
import { ElectionStatus } from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

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
  let requestDataForLog; // Variable to store incoming data for error logging

  // Initial Forbidden Check
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: electionId || "unknown",
      details: {
        error:
          "Forbidden: Insufficient privileges (only SUPER_ADMIN can update elections).",
        electionId: electionId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requestDataForLog = await request.json(); // Store incoming data
    const { name, description, startDate, endDate, status } = requestDataForLog;

    const currentElection = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!currentElection) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Election not found",
          electionId,
          providedData: requestDataForLog,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    const updateData = {};
    let newStartDate, newEndDate; // Declare outside for logging consistency

    // Handle name update
    if (name !== undefined) updateData.name = name;

    // Handle description update
    if (description !== undefined) updateData.description = description;

    // Handle startDate update
    if (startDate !== undefined) {
      newStartDate = new Date(startDate);
      if (isNaN(newStartDate.getTime())) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: "Invalid date format for startDate.",
            providedStartDate: startDate,
            providedData: requestDataForLog,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Invalid date format for startDate." },
          { status: 400 }
        );
      }
      // Use the *current* or *new* endDate for validation
      const effectiveEndDate = endDate
        ? new Date(endDate)
        : currentElection.endDate;
      if (newStartDate >= effectiveEndDate) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: "Start date must be before end date.",
            providedStartDate: startDate,
            effectiveEndDate: effectiveEndDate.toISOString(),
            providedData: requestDataForLog,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Start date must be before end date." },
          { status: 400 }
        );
      }
      updateData.startDate = newStartDate;
    }

    // Handle endDate update
    if (endDate !== undefined) {
      newEndDate = new Date(endDate);
      if (isNaN(newEndDate.getTime())) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: "Invalid date format for endDate.",
            providedEndDate: endDate,
            providedData: requestDataForLog,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Invalid date format for endDate." },
          { status: 400 }
        );
      }
      // Use the *current* or *new* startDate for validation
      const effectiveStartDate = startDate
        ? new Date(startDate)
        : currentElection.startDate;
      if (newEndDate <= effectiveStartDate) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: "End date must be after start date.",
            providedEndDate: endDate,
            effectiveStartDate: effectiveStartDate.toISOString(),
            providedData: requestDataForLog,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "End date must be after start date." },
          { status: 400 }
        );
      }
      updateData.endDate = newEndDate;
    }

    // Handle status update
    if (status !== undefined) {
      if (!Object.values(ElectionStatus).includes(status)) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: "Invalid election status provided.",
            providedStatus: status,
            providedData: requestDataForLog,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Invalid election status provided." },
          { status: 400 }
        );
      }
      // Prevent reverting election from certain statuses (e.g., COMPLETED, ARCHIVED)
      if (
        (currentElection.status === ElectionStatus.COMPLETED ||
          currentElection.status === ElectionStatus.ARCHIVED) &&
        status !== currentElection.status // Allow setting to same status
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Election",
          entityId: electionId,
          details: {
            error: "Cannot change election status from COMPLETED or ARCHIVED.",
            currentStatus: currentElection.status,
            attemptedStatus: status,
            providedData: requestDataForLog,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: "Cannot change election status from COMPLETED or ARCHIVED.",
          },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // If no changes are provided
    if (Object.keys(updateData).length === 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
        status: AuditLogStatus.SUCCESS, // Consider INFO if you have such a status
        entityType: "Election",
        entityId: electionId,
        details: {
          message: "No changes provided to update election.",
          providedData: requestDataForLog,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { message: "No changes provided to update." },
        { status: 200 }
      );
    }

    const updatedElection = await prisma.election.update({
      where: { id: electionId },
      data: updateData,
    });

    // Log successful update
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Election",
      entityId: updatedElection.id,
      details: {
        electionId: updatedElection.id,
        // Log the specific fields that were actually updated, showing old vs new values
        updatedFields: Object.keys(updateData).reduce((acc, key) => {
          if (key === "startDate" || key === "endDate") {
            acc[key] = {
              oldValue: currentElection[key]?.toISOString(), // Ensure ISO string for dates
              newValue: updatedElection[key]?.toISOString(),
            };
          } else {
            acc[key] = {
              oldValue: currentElection[key],
              newValue: updatedElection[key],
            };
          }
          return acc;
        }, {}),
        newElectionSnapshot: {
          name: updatedElection.name,
          status: updatedElection.status,
          startDate: updatedElection.startDate.toISOString(),
          endDate: updatedElection.endDate.toISOString(),
        },
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(updatedElection, { status: 200 });
  } catch (error) {
    console.error(`Error updating election ${electionId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: electionId || "unknown",
      details: {
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    if (error.code === "P2002") {
      // Unique constraint (e.g., if election name is unique)
      return NextResponse.json(
        { error: `An election with this name already exists.` },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      // Record to update not found (already handled by findUnique)
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to update election. Please check logs.` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  // context destructuring fixed
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  // Initial Forbidden Check
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.ELECTION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: electionId || "unknown",
      details: {
        error: "Forbidden: Only Super Admins can delete elections.",
        electionId: electionId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json(
      { error: "Forbidden: Only Super Admins can delete elections." },
      { status: 403 }
    );
  }

  try {
    // Fetch the election to get its details for logging BEFORE deletion
    const electionToDelete = await prisma.election.findUnique({
      where: { id: electionId },
      // Select all fields for detailed log of what was deleted
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        status: true,
        // Include any other relevant fields like scopeType, college if they exist on your model
        scopeType: true, // Assuming these might exist based on other models
        college: true,
      },
    });

    if (!electionToDelete) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Election not found to delete.",
          electionId,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Election not found to delete." },
        { status: 404 }
      );
    }

    // Attempt deletion
    await prisma.election.delete({
      where: { id: electionId },
    });

    // Log successful deletion
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_DELETED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Election",
      entityId: electionToDelete.id, // Use the ID of the deleted election
      details: {
        name: electionToDelete.name,
        description: electionToDelete.description,
        startDate: electionToDelete.startDate.toISOString(),
        endDate: electionToDelete.endDate.toISOString(),
        status: electionToDelete.status,
        // Include any other details fetched for the log
        scopeType: electionToDelete.scopeType,
        college: electionToDelete.college,
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(
      {
        message: `Election '${electionToDelete.name}' and its related data deleted successfully.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting election ${electionId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: electionId || "unknown",
      details: {
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        electionId: electionId || "unknown", // Re-add for context
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    if (error.code === "P2025") {
      // Record to delete not found by prisma.election.delete itself (though also caught by findUnique)
      return NextResponse.json(
        { error: "Election not found to delete (P2025)." },
        { status: 404 }
      );
    }
    if (error.code === "P2003") {
      // Foreign key constraint violation
      console.error(
        "ForeignKeyConstraintFailed (P2003) while deleting election:",
        error.meta?.field_name
      );
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Failed to delete election due to related records.",
          errorCode: error.code,
          constraintField: error.meta?.field_name,
          // Add details of the election that could not be deleted if `electionToDelete` is available
          electionName: electionToDelete?.name,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Failed to delete election. A related record is preventing deletion. Please check database relations and onDelete rules.",
        },
        { status: 409 } // Conflict
      );
    }
    return NextResponse.json(
      {
        error:
          "Failed to delete election due to an unexpected error. Please check logs.",
      },
      { status: 500 }
    );
  }
}
