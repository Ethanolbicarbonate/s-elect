// src/app/api/admin/positions/[positionId]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import { PositionType, College } from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger"; // NEW IMPORTS
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions"; // NEW IMPORTS
import { AuditLogStatus } from "@prisma/client"; // NEW IMPORTS

// GET - Fetch a specific position
export async function GET(request, context) {
  const params = await context.params;
  const { positionId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });
    if (!position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(position, { status: 200 });
  } catch (error) {
    console.error(`Error fetching position ${positionId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch position." },
      { status: 500 }
    );
  }
}

// PUT - Update a specific position
export async function PUT(request, context) {
  const params = await context.params;
  const { electionId, positionId } = params;
  const session = await getServerSession(authOptions);
  let requestDataForLog; // Variable to store incoming data for error logging

  // Initial Forbidden Check
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    // Log unauthorized attempt
    await logAdminActivity({
      session: session, // Pass session directly, will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Position", // Even if not found, it's about a position
      entityId: positionId || "unknown", // Log the ID that was attempted
      details: {
        error: "Forbidden access attempt",
        electionId: electionId || "unknown",
        positionId: positionId || "unknown",
        ipAddress: getIpAddressFromRequest(request),
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requestDataForLog = await request.json(); // Store incoming data
    const incomingData = requestDataForLog; // Use stored data

    // Check if electionId and positionId are valid (though route params usually ensure presence)
    if (!electionId || !positionId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Position",
        entityId: positionId || "unknown",
        details: {
          error: "Missing electionId or positionId in parameters.",
          electionId: electionId || "unknown",
          positionId: positionId || "unknown",
          providedData: incomingData,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Election ID or Position ID is missing from parameters." },
        { status: 400 }
      );
    }

    // 1. Fetch the existing position
    const existingPosition = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!existingPosition) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Position",
        entityId: positionId,
        details: {
          error: "Position not found",
          electionId,
          positionId,
          providedData: incomingData,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Position not found." },
        { status: 404 }
      );
    }

    // 2. Authorization Check for MODERATOR (existing and new scope)
    if (session.user.role === "MODERATOR") {
      // Check if moderator can operate on the EXISTING position's scope
      if (
        existingPosition.type === PositionType.USC &&
        session.user.college !== null
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Forbidden: College moderators cannot modify USC positions.",
            electionId,
            positionId,
            existingPositionDetails: {
              type: existingPosition.type,
              college: existingPosition.college,
            },
            moderatorCollege: session.user.college,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: "Forbidden: College moderators cannot modify USC positions.",
          },
          { status: 403 }
        );
      }
      if (existingPosition.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error: "Forbidden: USC moderators cannot modify CSC positions.",
              electionId,
              positionId,
              existingPositionDetails: {
                type: existingPosition.type,
                college: existingPosition.college,
              },
              moderatorCollege: session.user.college,
              providedData: incomingData,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Forbidden: USC moderators cannot modify CSC positions." },
            { status: 403 }
          );
        }
        if (existingPosition.college !== session.user.college) {
          // College Mod, wrong college
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error: "Forbidden: Cannot modify positions for another college.",
              electionId,
              positionId,
              existingPositionDetails: {
                type: existingPosition.type,
                college: existingPosition.college,
              },
              moderatorCollege: session.user.college,
              providedData: incomingData,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: Cannot modify positions for another college.",
            },
            { status: 403 }
          );
        }
      }

      // If moderator is attempting to change the scope (type or college) of the position
      // Ensure the NEW scope is also valid for them.
      const newProposedType =
        incomingData.type !== undefined
          ? incomingData.type
          : existingPosition.type;
      let newProposedCollege =
        incomingData.college !== undefined
          ? incomingData.college
          : existingPosition.college;

      if (
        incomingData.type !== undefined ||
        incomingData.college !== undefined
      ) {
        // Only check if type or college is part of the update
        if (newProposedType === PositionType.USC) {
          if (session.user.college !== null) {
            // College Mod trying to change/set to USC
            await logAdminActivity({
              session,
              actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
              status: AuditLogStatus.FAILURE,
              entityType: "Position",
              entityId: positionId,
              details: {
                error:
                  "Forbidden: College moderators cannot change position to USC type.",
                electionId,
                positionId,
                existingPositionDetails: {
                  type: existingPosition.type,
                  college: existingPosition.college,
                },
                newProposedType,
                newProposedCollege,
                moderatorCollege: session.user.college,
                providedData: incomingData,
              },
              ipAddress: getIpAddressFromRequest(request),
            });
            return NextResponse.json(
              {
                error:
                  "Forbidden: College moderators cannot change position to USC type.",
              },
              { status: 403 }
            );
          }
          newProposedCollege = null; // If type becomes USC, college must be null
        } else if (newProposedType === PositionType.CSC) {
          if (session.user.college === null) {
            // USC Mod trying to change/set to CSC
            await logAdminActivity({
              session,
              actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
              status: AuditLogStatus.FAILURE,
              entityType: "Position",
              entityId: positionId,
              details: {
                error:
                  "Forbidden: USC moderators cannot change position to CSC type.",
                electionId,
                positionId,
                existingPositionDetails: {
                  type: existingPosition.type,
                  college: existingPosition.college,
                },
                newProposedType,
                newProposedCollege,
                moderatorCollege: session.user.college,
                providedData: incomingData,
              },
              ipAddress: getIpAddressFromRequest(request),
            });
            return NextResponse.json(
              {
                error:
                  "Forbidden: USC moderators cannot change position to CSC type.",
              },
              { status: 403 }
            );
          }
          // If newProposedCollege is not provided in incomingData, and type is CSC, it must be mod's college.
          // If newProposedCollege IS provided, it must match mod's college.
          if (
            !newProposedCollege ||
            newProposedCollege !== session.user.college
          ) {
            await logAdminActivity({
              session,
              actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
              status: AuditLogStatus.FAILURE,
              entityType: "Position",
              entityId: positionId,
              details: {
                error: `Forbidden: Cannot change position to CSC type for college. Must be moderator's assigned college.`,
                electionId,
                positionId,
                existingPositionDetails: {
                  type: existingPosition.type,
                  college: existingPosition.college,
                },
                newProposedType,
                newProposedCollege,
                moderatorCollege: session.user.college,
                providedData: incomingData,
              },
              ipAddress: getIpAddressFromRequest(request),
            });
            return NextResponse.json(
              {
                error: `Forbidden: Cannot change position to CSC type for college '${
                  newProposedCollege || ""
                }'. Must be your assigned college (${session.user.college}).`,
              },
              { status: 403 }
            );
          }
        }
      }
      // If scope changes are proposed by moderator and valid, apply them to incomingData before constructing updateData
      if (incomingData.type !== undefined) incomingData.type = newProposedType;
      if (
        incomingData.college !== undefined ||
        newProposedType === PositionType.USC ||
        (newProposedType === PositionType.CSC &&
          newProposedCollege === session.user.college)
      ) {
        incomingData.college = newProposedCollege;
      }
    } else if (session.user.role === "SUPER_ADMIN") {
      // If SUPER_ADMIN changes type to USC, ensure college becomes null
      if (incomingData.type === PositionType.USC) {
        incomingData.college = null;
      } else if (
        incomingData.type === PositionType.CSC &&
        incomingData.college === undefined
      ) {
        // If type is CSC (either new or existing) and no college is provided in update by SA,
        // keep existing college if position was already CSC, otherwise it's an error if becoming CSC without college.
        if (existingPosition.type !== PositionType.CSC) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error:
                "College is required if changing position type to CSC by SA.",
              electionId,
              positionId,
              existingPositionDetails: {
                type: existingPosition.type,
                college: existingPosition.college,
              },
              providedData: incomingData,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "College is required if changing position type to CSC." },
            { status: 400 }
          );
        }
        // If existingPosition.type was CSC, incomingData.college being undefined means SA doesn't want to change it.
        // No action needed, updateData will just not include 'college'.
      } else if (
        incomingData.type === PositionType.CSC &&
        incomingData.college &&
        !Object.values(College).includes(incomingData.college)
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Invalid college value for CSC position by SA.",
            electionId,
            positionId,
            existingPositionDetails: {
              type: existingPosition.type,
              college: existingPosition.college,
            },
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Invalid college value for CSC position." },
          { status: 400 }
        );
      }
    }

    // 3. Construct updateData based on validated incomingData
    const updateData = {};
    if (incomingData.name !== undefined) updateData.name = incomingData.name;
    if (incomingData.description !== undefined)
      updateData.description = incomingData.description;

    // Handle type and college carefully based on previous validation for SA and Moderator
    if (incomingData.type !== undefined) {
      if (!Object.values(PositionType).includes(incomingData.type)) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Invalid position type provided.",
            electionId,
            positionId,
            providedType: incomingData.type,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Invalid position type provided." },
          { status: 400 }
        );
      }
      updateData.type = incomingData.type;
      if (updateData.type === PositionType.USC) {
        updateData.college = null;
      } else if (updateData.type === PositionType.CSC) {
        if (
          incomingData.college === undefined &&
          session.user.role === "SUPER_ADMIN" &&
          existingPosition.type === PositionType.CSC
        ) {
          updateData.college = existingPosition.college;
        } else if (
          incomingData.college &&
          Object.values(College).includes(incomingData.college)
        ) {
          updateData.college = incomingData.college;
        } else {
          // This case should have been caught by moderator checks or SA explicit CSC college requirement
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error:
                "Valid college is required for CSC positions after scope validation (fallback).",
              electionId,
              positionId,
              providedData: incomingData,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error:
                "Valid college is required for CSC positions after scope validation.",
            },
            { status: 400 }
          );
        }
      }
    } else if (incomingData.hasOwnProperty("college")) {
      // Only college is being changed, type remains same
      if (existingPosition.type === PositionType.USC) {
        updateData.college = null; // Cannot set college for USC type
      } else if (existingPosition.type === PositionType.CSC) {
        if (
          !incomingData.college ||
          !Object.values(College).includes(incomingData.college)
        ) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error: "Valid college is required for CSC positions.",
              electionId,
              positionId,
              providedCollege: incomingData.college,
              providedData: incomingData,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Valid college is required for CSC positions." },
            { status: 400 }
          );
        }
        updateData.college = incomingData.college;
      }
    }

    if (incomingData.maxVotesAllowed !== undefined) {
      const maxVotes = parseInt(incomingData.maxVotesAllowed);
      if (isNaN(maxVotes) || maxVotes < 1) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Max votes allowed must be a number and at least 1.",
            electionId,
            positionId,
            providedValue: incomingData.maxVotesAllowed,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Max votes allowed must be a number and at least 1." },
          { status: 400 }
        );
      }
      updateData.maxVotesAllowed = maxVotes;
      // Re-check minVotes if maxVotes is changing
      const currentMinVotes =
        incomingData.minVotesRequired !== undefined
          ? parseInt(incomingData.minVotesRequired)
          : existingPosition.minVotesRequired !== null
          ? existingPosition.minVotesRequired
          : 0;
      if (currentMinVotes > maxVotes) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error:
              "Min votes required cannot exceed max votes allowed when maxVotes is changed.",
            electionId,
            positionId,
            providedMaxVotes: incomingData.maxVotesAllowed,
            providedMinVotes: incomingData.minVotesRequired,
            existingMinVotes: existingPosition.minVotesRequired,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Min votes required cannot exceed max votes allowed." },
          { status: 400 }
        );
      }
      if (incomingData.minVotesRequired !== undefined)
        updateData.minVotesRequired = currentMinVotes; // Add if it was part of incoming
    }

    if (
      incomingData.minVotesRequired !== undefined &&
      updateData.maxVotesAllowed === undefined
    ) {
      // if only minVotes is changing
      const minVotes = parseInt(incomingData.minVotesRequired);
      const currentMaxVotes = existingPosition.maxVotesAllowed; // Max votes isn't changing
      if (isNaN(minVotes) || minVotes < 0) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Min votes required must be a non-negative number.",
            electionId,
            positionId,
            providedValue: incomingData.minVotesRequired,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Min votes required must be a non-negative number." },
          { status: 400 }
        );
      }
      if (minVotes > currentMaxVotes) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error:
              "Min votes required cannot exceed max votes allowed (only minVotes changing).",
            electionId,
            positionId,
            providedMinVotes: incomingData.minVotesRequired,
            existingMaxVotes: existingPosition.maxVotesAllowed,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Min votes required cannot exceed max votes allowed." },
          { status: 400 }
        );
      }
      updateData.minVotesRequired = minVotes;
    }

    if (incomingData.order !== undefined) {
      const order = parseInt(incomingData.order);
      if (isNaN(order)) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Order must be a number.",
            electionId,
            positionId,
            providedValue: incomingData.order,
            providedData: incomingData,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Order must be a number." },
          { status: 400 }
        );
      }
      updateData.order = order;
    }

    if (Object.keys(updateData).length === 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
        status: AuditLogStatus.SUCCESS, // Consider logging as INFO if you have such a status, but SUCCESS is acceptable for a no-op
        entityType: "Position",
        entityId: positionId,
        details: {
          message: "No changes provided to update position.",
          electionId,
          positionId,
          providedData: incomingData,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { message: "No changes provided to update." },
        { status: 200 }
      ); // Or 304 Not Modified
    }

    // 4. Perform the update
    const updatedPosition = await prisma.position.update({
      where: { id: positionId },
      data: updateData,
    });

    // Log successful update
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Position",
      entityId: updatedPosition.id,
      details: {
        electionId,
        positionId: updatedPosition.id,
        // Log the specific fields that were actually updated, showing old vs new values
        updatedFields: Object.keys(updateData).reduce((acc, key) => {
          acc[key] = {
            oldValue: existingPosition[key],
            newValue: updatedPosition[key],
          };
          return acc;
        }, {}),
        // A snapshot of the updated position for easy reference
        newPositionSnapshot: {
          name: updatedPosition.name,
          description: updatedPosition.description,
          type: updatedPosition.type,
          college: updatedPosition.college,
          maxVotesAllowed: updatedPosition.maxVotesAllowed,
          minVotesRequired: updatedPosition.minVotesRequired,
          order: updatedPosition.order,
        },
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(updatedPosition, { status: 200 });
  } catch (error) {
    console.error(`Error updating position ${positionId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.POSITION_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Position",
      entityId: positionId || "unknown", // Use positionId from params, or 'unknown'
      details: {
        electionId: electionId || "unknown",
        error: error.message,
        errorCode: error.code, // Prisma error code (kung available)
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    if (error.code === "P2002") {
      // Unique constraint (e.g., electionId, name, college)
      return NextResponse.json(
        {
          error:
            "A position with this name (and college, if CSC) already exists for this election.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Failed to update position. Please check logs.` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific position
export async function DELETE(request, context) {
  const params = await context.params;
  const { electionId, positionId } = params;
  const session = await getServerSession(authOptions);

  // Initial Forbidden Check (logs even before session is fully processed if user is not authenticated)
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session: session, // Pass session directly, will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Position",
      entityId: positionId || "unknown",
      details: {
        error: "Forbidden access attempt",
        electionId: electionId || "unknown",
        positionId: positionId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const positionToDelete = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!positionToDelete) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Position",
        entityId: positionId,
        details: {
          error: "Position not found",
          electionId,
          positionId,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Position not found." },
        { status: 404 }
      );
    }

    // SCOPE VALIDATION FOR MODERATOR
    if (session.user.role === "MODERATOR") {
      if (
        positionToDelete.type === PositionType.USC &&
        session.user.college !== null
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
          status: AuditLogStatus.FAILURE,
          entityType: "Position",
          entityId: positionId,
          details: {
            error: "Forbidden: College moderators cannot delete USC positions.",
            electionId,
            positionId,
            positionDetails: {
              type: positionToDelete.type,
              college: positionToDelete.college,
            },
            moderatorCollege: session.user.college,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: "Forbidden: College moderators cannot delete USC positions.",
          },
          { status: 403 }
        );
      }
      if (positionToDelete.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error: "Forbidden: USC moderators cannot delete CSC positions.",
              electionId,
              positionId,
              positionDetails: {
                type: positionToDelete.type,
                college: positionToDelete.college,
              },
              moderatorCollege: session.user.college,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Forbidden: USC moderators cannot delete CSC positions." },
            { status: 403 }
          );
        }
        if (positionToDelete.college !== session.user.college) {
          // College Mod, wrong college
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
            status: AuditLogStatus.FAILURE,
            entityType: "Position",
            entityId: positionId,
            details: {
              error: "Forbidden: Cannot delete positions from another college.",
              electionId,
              positionId,
              positionDetails: {
                type: positionToDelete.type,
                college: positionToDelete.college,
              },
              moderatorCollege: session.user.college,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: Cannot delete positions from another college.",
            },
            { status: 403 }
          );
        }
      }
    }

    const candidatesCount = await prisma.candidate.count({
      where: { positionId: positionId },
    });

    if (candidatesCount > 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Position",
        entityId: positionId,
        details: {
          error: "Position has associated candidates",
          electionId,
          positionId,
          candidatesCount,
          positionName: positionToDelete.name,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Cannot delete position. It has associated candidates. Please remove them first.",
        },
        { status: 409 } // Conflict
      );
    }

    await prisma.position.delete({
      where: { id: positionId },
    });

    // Log successful deletion
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Position",
      entityId: positionToDelete.id, // Use the ID of the deleted position
      details: {
        electionId,
        positionId: positionToDelete.id,
        name: positionToDelete.name,
        type: positionToDelete.type,
        college: positionToDelete.college,
        description: positionToDelete.description,
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    // On successful deletion with no content to return
    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(`Error deleting position ${positionId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.POSITION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Position",
      entityId: positionId || "unknown",
      details: {
        electionId: electionId || "unknown",
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    // Prisma's P2025 "Record to delete not found" might also be caught here if findUnique fails before delete,
    // though it's already explicitly checked above.
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Position not found." }, // This would ideally be caught by the findUnique check
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to delete position. Please check logs.` },
      { status: 500 }
    );
  }
}
