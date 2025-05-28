// src/app/api/admin/partylists/[partylistId]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType, College } from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

// GET - Fetch a specific partylist
export async function GET(request, context) {
  const session = await getServerSession(authOptions);
  const { partylistId } = await context.params;

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const partylist = await prisma.partylist.findUnique({
      where: { id: partylistId },
    });

    if (!partylist) {
      return NextResponse.json(
        { error: "Partylist not found" },
        { status: 404 }
      );
    }

    // Optional: Further authorization for MODERATOR/AUDITOR to view only their scope
    if (session.user.role === "MODERATOR" || session.user.role === "AUDITOR") {
      if (
        partylist.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          { error: "Forbidden: College users cannot view this USC partylist." },
          { status: 403 }
        );
      }
      if (partylist.type === PositionType.CSC) {
        if (
          session.user.college === null &&
          partylist.type === PositionType.CSC
        ) {
          // USC user trying to view CSC
          return NextResponse.json(
            {
              error:
                "Forbidden: USC users cannot view this CSC partylist directly without college scope.",
            },
            { status: 403 }
          );
        }
        if (
          partylist.college !== session.user.college &&
          session.user.college !== null
        ) {
          // College user, wrong college
          return NextResponse.json(
            {
              error:
                "Forbidden: Access to this partylist is restricted to its college.",
            },
            { status: 403 }
          );
        }
      }
    }
    return NextResponse.json(partylist, { status: 200 });
  } catch (error) {
    console.error(`Error fetching partylist ${partylistId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch partylist." },
      { status: 500 }
    );
  }
}

async function authorizePartylistAccess(electionId, session) {
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return {
      authorized: false,
      error: "Forbidden: Insufficient privileges.",
      status: 403,
    };
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election) {
    return { authorized: false, error: "Election not found.", status: 404 };
  }

  if (session.user.role === "MODERATOR") {
    if (!election.scopeType) {
      return {
        authorized: false,
        error: "Forbidden: Election scope not defined.",
        status: 403,
      };
    }
    if (election.scopeType === "USC" && session.user.college !== null) {
      return {
        authorized: false,
        error:
          "Forbidden: College moderators cannot manage partylists for USC elections.",
        status: 403,
      };
    }
    if (election.scopeType === "CSC") {
      if (session.user.college === null) {
        return {
          authorized: false,
          error:
            "Forbidden: USC moderators cannot manage partylists for CSC elections.",
          status: 403,
        };
      }
      if (election.college !== session.user.college) {
        return {
          authorized: false,
          error: `Forbidden: Cannot manage partylists for an election scoped to college '${election.college}'.`,
          status: 403,
        };
      }
    }
  }
  return { authorized: true };
}

// PUT - Update a specific partylist
export async function PUT(request, context) {
  const session = await getServerSession(authOptions);
  const { electionId, partylistId } = await context.params;
  let requestDataForLog; // Variable to store incoming data for error logging

  // Initial Forbidden Check
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Partylist",
      entityId: partylistId || "unknown",
      details: {
        error: "Forbidden: Insufficient privileges.",
        electionId: electionId || "unknown",
        partylistId: partylistId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    const existingPartylist = await prisma.partylist.findUnique({
      where: { id: partylistId },
    });

    if (!existingPartylist || existingPartylist.electionId !== electionId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Partylist",
        entityId: partylistId,
        details: {
          error: "Partylist not found or does not belong to this election.",
          electionId,
          partylistId,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Partylist not found or does not belong to this election." },
        { status: 404 }
      );
    }

    requestDataForLog = await request.json(); // Store incoming data
    const dataToUpdate = requestDataForLog;
    const { name, acronym, logoUrl, logoPublicId, platform, type, college } =
      dataToUpdate;

    // --- SCOPE VALIDATION FOR MODERATOR (on existingPartylist) ---
    if (session.user.role === "MODERATOR") {
      if (
        existingPartylist.type === PositionType.USC &&
        session.user.college !== null
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Partylist",
          entityId: partylistId,
          details: {
            error:
              "Forbidden: College moderators cannot modify USC partylists.",
            electionId,
            partylistId,
            existingPartylistDetails: {
              type: existingPartylist.type,
              college: existingPartylist.college,
            },
            moderatorCollege: session.user.college,
            providedData: dataToUpdate,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot modify USC partylists.",
          },
          { status: 403 }
        );
      }
      if (existingPartylist.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Partylist",
            entityId: partylistId,
            details: {
              error: "Forbidden: USC moderators cannot modify CSC partylists.",
              electionId,
              partylistId,
              existingPartylistDetails: {
                type: existingPartylist.type,
                college: existingPartylist.college,
              },
              moderatorCollege: session.user.college,
              providedData: dataToUpdate,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot modify CSC partylists.",
            },
            { status: 403 }
          );
        }
        if (existingPartylist.college !== session.user.college) {
          // College Mod, wrong college
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Partylist",
            entityId: partylistId,
            details: {
              error: "Forbidden: Cannot modify partylists for another college.",
              electionId,
              partylistId,
              existingPartylistDetails: {
                type: existingPartylist.type,
                college: existingPartylist.college,
              },
              moderatorCollege: session.user.college,
              providedData: dataToUpdate,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: Cannot modify partylists for another college.",
            },
            { status: 403 }
          );
        }
      }

      // If moderator is attempting to change the scope (type or college)
      if (type !== undefined && type !== existingPartylist.type) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Partylist",
          entityId: partylistId,
          details: {
            error: "Forbidden: Moderators cannot change partylist type.",
            electionId,
            partylistId,
            existingType: existingPartylist.type,
            newProposedType: type,
            moderatorCollege: session.user.college,
            providedData: dataToUpdate,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: Moderators cannot change the scope (type/college) of a partylist. Recreate if needed.",
          },
          { status: 403 }
        );
      }
      if (
        college !== undefined &&
        college !== existingPartylist.college &&
        existingPartylist.type === PositionType.CSC
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Partylist",
          entityId: partylistId,
          details: {
            error: "Forbidden: Moderators cannot change partylist college.",
            electionId,
            partylistId,
            existingCollege: existingPartylist.college,
            newProposedCollege: college,
            moderatorCollege: session.user.college,
            providedData: dataToUpdate,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: Moderators cannot change the college scope of a CSC partylist.",
          },
          { status: 403 }
        );
      }
      // For simplicity, moderators cannot change the `type` or `college` of an existing partylist.
      // If type/college are in dataToUpdate from a moderator, ignore them or error.
      if (
        (dataToUpdate.type && dataToUpdate.type !== existingPartylist.type) ||
        (dataToUpdate.college &&
          dataToUpdate.college !== existingPartylist.college &&
          existingPartylist.type === PositionType.CSC)
      ) {
        console.warn(
          "Moderator attempting to change partylist scope, ignoring and logging."
        );
        // Log this attempt, but continue processing other fields
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
          status: AuditLogStatus.FAILURE, // Or a specific warning status if available
          entityType: "Partylist",
          entityId: partylistId,
          details: {
            message:
              "Moderator attempted to change partylist scope (type/college) which is not allowed. Ignoring those fields.",
            electionId,
            partylistId,
            attemptedChanges: { type, college },
            existingPartylistType: existingPartylist.type,
            existingPartylistCollege: existingPartylist.college,
            moderatorCollege: session.user.college,
            providedData: dataToUpdate,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        delete dataToUpdate.type;
        delete dataToUpdate.college;
      }
    }

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (acronym !== undefined) updatePayload.acronym = acronym;
    if (platform !== undefined) updatePayload.platform = platform;
    if (logoUrl !== undefined) updatePayload.logoUrl = logoUrl;
    if (logoPublicId !== undefined) updatePayload.logoPublicId = logoPublicId;

    // SUPER_ADMIN can change type and college
    if (session.user.role === "SUPER_ADMIN") {
      if (type !== undefined) {
        if (!Object.values(PositionType).includes(type)) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Partylist",
            entityId: partylistId,
            details: {
              error: "Invalid partylist type provided by SUPER_ADMIN.",
              electionId,
              partylistId,
              providedType: type,
              providedData: dataToUpdate,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Invalid partylist type." },
            { status: 400 }
          );
        }
        updatePayload.type = type;
        if (type === PositionType.USC) {
          updatePayload.college = null; // USC partylists must have null college
        } else if (type === PositionType.CSC) {
          if (!college || !Object.values(College).includes(college)) {
            await logAdminActivity({
              session,
              actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
              status: AuditLogStatus.FAILURE,
              entityType: "Partylist",
              entityId: partylistId,
              details: {
                error:
                  "Valid college is required for CSC partylists by SUPER_ADMIN.",
                electionId,
                partylistId,
                providedCollege: college,
                providedData: dataToUpdate,
              },
              ipAddress: getIpAddressFromRequest(request),
            });
            return NextResponse.json(
              { error: "Valid college is required for CSC partylists." },
              { status: 400 }
            );
          }
          updatePayload.college = college;
        }
      } else if (
        college !== undefined &&
        existingPartylist.type === PositionType.CSC
      ) {
        // Type not changing, but college might be
        if (!Object.values(College).includes(college)) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Partylist",
            entityId: partylistId,
            details: {
              error: "Invalid college for CSC partylist by SUPER_ADMIN.",
              electionId,
              partylistId,
              providedCollege: college,
              providedData: dataToUpdate,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Invalid college for CSC partylist." },
            { status: 400 }
          );
        }
        updatePayload.college = college;
      } else if (
        college !== undefined &&
        existingPartylist.type === PositionType.USC
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Partylist",
          entityId: partylistId,
          details: {
            error: "Cannot set college for USC partylist by SUPER_ADMIN.",
            electionId,
            partylistId,
            providedCollege: college,
            providedData: dataToUpdate,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        updatePayload.college = null; // Cannot set college for USC type (already null if not provided)
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
        status: AuditLogStatus.SUCCESS, // Consider INFO if you have it
        entityType: "Partylist",
        entityId: partylistId,
        details: {
          message: "No actual changes provided to update partylist.",
          electionId,
          partylistId,
          providedData: dataToUpdate,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "No data provided for update." }, // This returns a 400, but the log treats it as a non-error operation.
        { status: 400 }
      );
    }

    const updatedPartylist = await prisma.partylist.update({
      where: { id: partylistId },
      data: updatePayload,
    });

    // Log successful update
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Partylist",
      entityId: updatedPartylist.id,
      details: {
        electionId,
        partylistId: updatedPartylist.id,
        // Log the specific fields that were actually updated, showing old vs new values
        updatedFields: Object.keys(updatePayload).reduce((acc, key) => {
          acc[key] = {
            oldValue: existingPartylist[key],
            newValue: updatedPartylist[key],
          };
          return acc;
        }, {}),
        newPartylistSnapshot: {
          name: updatedPartylist.name,
          acronym: updatedPartylist.acronym,
          type: updatedPartylist.type,
          college: updatedPartylist.college,
          logoUrl: updatedPartylist.logoUrl, // Log the URL
          logoPublicId: updatedPartylist.logoPublicId, // Log the publicId
        },
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(updatedPartylist, { status: 200 });
  } catch (error) {
    console.error(`Error updating partylist ${partylistId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Partylist",
      entityId: partylistId || "unknown",
      details: {
        electionId: electionId || "unknown",
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    if (error.code === "P2002" && error.meta?.target) {
      const targetFields = error.meta.target.join(", ");
      return NextResponse.json(
        {
          error: `A partylist with these details (${targetFields}) already exists for this election.`,
        },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Partylist not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to update partylist. Please check logs.` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific partylist
export async function DELETE(request, context) {
  const session = await getServerSession(authOptions);
  const { electionId, partylistId } = await context.params;

  // Initial Forbidden Check
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Partylist",
      entityId: partylistId || "unknown",
      details: {
        error: "Forbidden: Insufficient privileges.",
        electionId: electionId || "unknown",
        partylistId: partylistId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    const partylistToDelete = await prisma.partylist.findUnique({
      where: { id: partylistId },
    });

    if (!partylistToDelete || partylistToDelete.electionId !== electionId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Partylist",
        entityId: partylistId,
        details: {
          error: "Partylist not found or does not belong to this election.",
          electionId,
          partylistId,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Partylist not found or does not belong to this election." },
        { status: 404 }
      );
    }

    // --- SCOPE VALIDATION FOR MODERATOR ---
    if (session.user.role === "MODERATOR") {
      if (
        partylistToDelete.type === PositionType.USC &&
        session.user.college !== null
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
          status: AuditLogStatus.FAILURE,
          entityType: "Partylist",
          entityId: partylistId,
          details: {
            error:
              "Forbidden: College moderators cannot delete USC partylists.",
            electionId,
            partylistId,
            partylistDetails: {
              type: partylistToDelete.type,
              college: partylistToDelete.college,
            },
            moderatorCollege: session.user.college,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot delete USC partylists.",
          },
          { status: 403 }
        );
      }
      if (partylistToDelete.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
            status: AuditLogStatus.FAILURE,
            entityType: "Partylist",
            entityId: partylistId,
            details: {
              error: "Forbidden: USC moderators cannot delete CSC partylists.",
              electionId,
              partylistId,
              partylistDetails: {
                type: partylistToDelete.type,
                college: partylistToDelete.college,
              },
              moderatorCollege: session.user.college,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot delete CSC partylists.",
            },
            { status: 403 }
          );
        }
        if (partylistToDelete.college !== session.user.college) {
          // College Mod, wrong college
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
            status: AuditLogStatus.FAILURE,
            entityType: "Partylist",
            entityId: partylistId,
            details: {
              error:
                "Forbidden: Cannot delete partylists from another college.",
              electionId,
              partylistId,
              partylistDetails: {
                type: partylistToDelete.type,
                college: partylistToDelete.college,
              },
              moderatorCollege: session.user.college,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error:
                "Forbidden: Cannot delete partylists from another college.",
            },
            { status: 403 }
          );
        }
      }
    }

    // onDelete: SetNull on Candidate.partylistId handles candidate disassociation
    await prisma.partylist.delete({
      where: { id: partylistId },
    });

    // Log successful deletion
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Partylist",
      entityId: partylistToDelete.id, // Use the ID of the deleted partylist
      details: {
        electionId,
        partylistId: partylistToDelete.id,
        name: partylistToDelete.name,
        acronym: partylistToDelete.acronym,
        type: partylistToDelete.type,
        college: partylistToDelete.college,
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting partylist ${partylistId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Partylist",
      entityId: partylistId || "unknown",
      details: {
        electionId: electionId || "unknown",
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    if (error.code === "P2025") {
      // This is caught by findUnique first, but as a fallback
      return NextResponse.json(
        { error: "Partylist not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to delete partylist. Please check logs.` },
      { status: 500 }
    );
  }
}
