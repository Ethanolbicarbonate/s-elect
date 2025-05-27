// src/app/api/admin/candidates/[candidateId]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType } from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

// GET - Fetch a specific candidate
export async function GET(request, context) {
  const params = await context.params;
  const { candidateId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { position: true, partylist: true /*, student: true */ },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Authorization for Moderators
    if (session.user.role === "MODERATOR") {
      if (
        candidate.position.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot view this USC candidate detail.",
          },
          { status: 403 }
        );
      }
      if (candidate.position.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC mod
          return NextResponse.json(
            {
              error:
                "Forbidden: USC moderators cannot view this CSC candidate detail.",
            },
            { status: 403 }
          );
        }
        if (candidate.position.college !== session.user.college) {
          // College mod, wrong college
          return NextResponse.json(
            { error: "Forbidden: Access to this candidate is restricted." },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json(candidate, { status: 200 });
  } catch (error) {
    console.error(`Error fetching candidate ${candidateId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch candidate." },
      { status: 500 }
    );
  }
}

// PUT - Update a specific candidate
export async function PUT(request, context) {
  const params = await context.params;
  const { candidateId } = params;
  const session = await getServerSession(authOptions);
  let requestDataForLog; // Variable to store incoming data for error logging

  // Initial Forbidden Check
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Candidate",
      entityId: candidateId || "unknown",
      details: {
        error: "Forbidden: Insufficient privileges.",
        candidateId: candidateId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requestDataForLog = await request.json(); // Store incoming data
    const data = requestDataForLog;
    // Destructure all possible fields from Candidate model
    const {
      firstName,
      lastName,
      middleName,
      nickname,
      photoUrl,
      bio,
      platformPoints,
      isIndependent,
      electionId, // electionId might be provided, but typically candidates aren't moved between elections
      positionId,
      partylistId,
    } = data;

    const candidateToUpdate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { position: true, partylist: true, election: true }, // Include relations for comprehensive auth/validation
    });

    if (!candidateToUpdate) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          error: "Candidate not found to update.",
          candidateId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Candidate not found to update." },
        { status: 404 }
      );
    }

    // Authorization for Moderators (on existing candidate's position)
    if (session.user.role === "MODERATOR") {
      if (
        candidateToUpdate.position.type === PositionType.USC &&
        session.user.college !== null
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error:
              "Forbidden: College moderators cannot update USC candidates.",
            candidatePositionType: candidateToUpdate.position.type,
            moderatorCollege: session.user.college,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot update USC candidates.",
          },
          { status: 403 }
        );
      }
      if (candidateToUpdate.position.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC mod
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error: "Forbidden: USC moderators cannot update CSC candidates.",
              candidatePositionType: candidateToUpdate.position.type,
              moderatorCollege: session.user.college,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot update CSC candidates.",
            },
            { status: 403 }
          );
        }
        if (candidateToUpdate.position.college !== session.user.college) {
          // College mod, wrong college
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error: "Forbidden: Cannot update candidates for another college.",
              candidatePositionCollege: candidateToUpdate.position.college,
              moderatorCollege: session.user.college,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: Cannot update candidates for another college.",
            },
            { status: 403 }
          );
        }
      }

      // Check if the new positionId (if changed) is valid for this moderator
      if (positionId && positionId !== candidateToUpdate.positionId) {
        const newPosition = await prisma.position.findUnique({
          where: { id: positionId },
        });
        if (!newPosition) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error: "New position not found.",
              newPositionId: positionId,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "New position not found." },
            { status: 404 }
          );
        }
        if (
          newPosition.type === PositionType.USC &&
          session.user.college !== null
        ) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error:
                "Forbidden: College moderators cannot move candidate to USC position.",
              newPositionType: newPosition.type,
              moderatorCollege: session.user.college,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error:
                "Forbidden: College moderators cannot move candidate to USC position.",
            },
            { status: 403 }
          );
        }
        if (
          newPosition.type === PositionType.CSC &&
          (session.user.college === null ||
            newPosition.college !== session.user.college)
        ) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error:
                "Forbidden: Cannot move candidate to this CSC position (moderator scope).",
              newPositionType: newPosition.type,
              newPositionCollege: newPosition.college,
              moderatorCollege: session.user.college,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Forbidden: Cannot move candidate to this CSC position." },
            { status: 403 }
          );
        }
      }
    }

    // Determine final values for check
    const finalIsIndependent =
      isIndependent !== undefined
        ? isIndependent
        : candidateToUpdate.isIndependent;
    const finalPositionId =
      positionId !== undefined ? positionId : candidateToUpdate.positionId;
    const finalPartylistId = finalIsIndependent
      ? null
      : partylistId !== undefined
      ? partylistId
      : candidateToUpdate.partylistId;

    // Validate Partylist relationship consistency if changed
    if (finalIsIndependent && finalPartylistId !== null) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          error:
            "Independent candidate cannot be assigned to a partylist (inconsistency).",
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Independent candidate cannot be assigned to a partylist." },
        { status: 400 }
      );
    }
    if (!finalIsIndependent && finalPartylistId === null) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          error:
            "Non-independent candidate must have a partylist ID (inconsistency).",
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Partylist ID is required if candidate is not independent." },
        { status: 400 }
      );
    }

    // Re-fetch targetPosition and Partylist if IDs potentially changed
    const targetPosition = await prisma.position.findUnique({
      where: { id: finalPositionId },
    });
    if (!targetPosition) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
        status: AuditLogStatus.FAILURE,
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          error: "Target position for candidate update not found.",
          targetPositionId: finalPositionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Target position not found." },
        { status: 404 }
      );
    }

    let targetPartylist = null;
    if (finalPartylistId) {
      targetPartylist = await prisma.partylist.findUnique({
        where: { id: finalPartylistId },
      });
      if (!targetPartylist) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error: "Target partylist for candidate update not found.",
            targetPartylistId: finalPartylistId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Target partylist not found." },
          { status: 404 }
        );
      }
      // Ensure partylist scope matches new position scope
      if (targetPartylist.type !== targetPosition.type) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error: "Partylist type does not match target position type.",
            targetPartylistId: finalPartylistId,
            targetPositionId: finalPositionId,
            partylistType: targetPartylist.type,
            positionType: targetPosition.type,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Partylist type must match target position type." },
          { status: 400 }
        );
      }
      if (
        targetPartylist.type === PositionType.CSC &&
        targetPartylist.college !== targetPosition.college
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error: "Partylist college does not match target position college.",
            targetPartylistId: finalPartylistId,
            targetPositionId: finalPositionId,
            partylistCollege: targetPartylist.college,
            positionCollege: targetPosition.college,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Partylist college must match target position college for CSC.",
          },
          { status: 400 }
        );
      }
    }

    // Business logic for 1 candidate per partylist per position (if maxVotesAllowed === 1 for the position)
    if (
      !finalIsIndependent &&
      finalPartylistId &&
      targetPosition.maxVotesAllowed === 1
    ) {
      const existingCandidateForPartyPosition =
        await prisma.candidate.findFirst({
          where: {
            electionId: candidateToUpdate.electionId, // Assuming election doesn't change, or pass it in data
            positionId: finalPositionId,
            partylistId: finalPartylistId,
            id: { not: candidateId }, // Exclude the current candidate being updated
          },
        });
      if (existingCandidateForPartyPosition) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error:
              "This partylist already has another candidate for this single-vote position.",
            electionId: candidateToUpdate.electionId,
            positionId: finalPositionId,
            partylistId: finalPartylistId,
            positionName: targetPosition.name,
            partylistName: targetPartylist?.name,
            conflictingCandidateId: existingCandidateForPartyPosition.id,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: `This partylist already has another candidate for the position of ${targetPosition.name}.`,
          },
          { status: 409 }
        );
      }
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (platformPoints !== undefined)
      updateData.platformPoints = Array.isArray(platformPoints)
        ? platformPoints
        : platformPoints
        ? [platformPoints]
        : [];
    if (isIndependent !== undefined) updateData.isIndependent = isIndependent;

    // ElectionId usually shouldn't change
    if (
      electionId !== undefined &&
      electionId !== candidateToUpdate.electionId
    ) {
      // Potentially add a more strict check/log here if election change is rare/disallowed.
      // For now, it's allowed if provided.
      const newElection = await prisma.election.findUnique({
        where: { id: electionId },
      });
      if (!newElection) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error: "New election for candidate not found.",
            providedElectionId: electionId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "New election not found." },
          { status: 404 }
        );
      }
      updateData.electionId = electionId;
    }

    if (positionId !== undefined) updateData.positionId = positionId;

    if (finalIsIndependent) {
      updateData.partylistId = null;
    } else if (partylistId !== undefined) {
      updateData.partylistId = partylistId;
    } else if (
      partylistId === undefined &&
      !candidateToUpdate.isIndependent &&
      !finalIsIndependent
    ) {
      // If partylistId is undefined and not changing to independent, keep existing partylistId.
      // This case is implicitly handled if not in updateData.
    }

    if (Object.keys(updateData).length === 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
        status: AuditLogStatus.SUCCESS, // Or INFO
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          message: "No actual changes provided to update candidate.",
          candidateId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { message: "No data provided for update." },
        { status: 200 } // Or 400 as in original, but 200 is fine if no change is a valid state
      );
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
    });

    // Log successful update
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Candidate",
      entityId: updatedCandidate.id,
      details: {
        candidateId: updatedCandidate.id,
        candidateName: `${updatedCandidate.firstName} ${updatedCandidate.lastName}`,
        electionId: updatedCandidate.electionId,
        positionId: updatedCandidate.positionId,
        partylistId: updatedCandidate.partylistId,
        isIndependent: updatedCandidate.isIndependent,
        // Log the specific fields that were actually updated, showing old vs new values
        updatedFields: Object.keys(updateData).reduce((acc, key) => {
          if (key === "platformPoints") {
            // Special handling for arrays
            acc[key] = {
              oldValue: candidateToUpdate[key],
              newValue: updatedCandidate[key],
            };
          } else {
            acc[key] = {
              oldValue: candidateToUpdate[key],
              newValue: updatedCandidate[key],
            };
          }
          return acc;
        }, {}),
        newCandidateSnapshot: {
          firstName: updatedCandidate.firstName,
          lastName: updatedCandidate.lastName,
          positionName: targetPosition?.name,
          partylistName: targetPartylist?.name || "N/A",
          isIndependent: updatedCandidate.isIndependent,
        },
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(updatedCandidate, { status: 200 });
  } catch (error) {
    console.error(`Error updating candidate ${candidateId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_UPDATED,
      status: AuditLogStatus.FAILURE,
      entityType: "Candidate",
      entityId: candidateId || "unknown",
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
      // Unique constraint violation (e.g., if there's a unique constraint on candidate name per position, or a more complex one)
      return NextResponse.json(
        {
          error:
            "A conflict occurred (e.g., unique candidate name/partylist per position).",
        },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      // Record to update not found (though already checked explicitly)
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to update candidate. Please check logs.` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const params = await context.params;
  const { candidateId } = params;
  const session = await getServerSession(authOptions);

  // Initial Forbidden Check
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Candidate",
      entityId: candidateId || "unknown",
      details: {
        error: "Forbidden: Insufficient privileges.",
        candidateId: candidateId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const candidateToDelete = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { position: true, election: true, partylist: true }, // Include relations for comprehensive logging
    });

    if (!candidateToDelete) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          error: "Candidate not found.",
          candidateId,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }

    // Moderator Authorization
    if (session.user.role === "MODERATOR") {
      if (
        candidateToDelete.position.type === PositionType.USC &&
        session.user.college !== null
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
          status: AuditLogStatus.FAILURE,
          entityType: "Candidate",
          entityId: candidateId,
          details: {
            error:
              "Forbidden: College moderators cannot delete USC candidates.",
            candidatePositionType: candidateToDelete.position.type,
            moderatorCollege: session.user.college,
            candidateDetails: {
              name: `${candidateToDelete.firstName} ${candidateToDelete.lastName}`,
              position: candidateToDelete.position.name,
            },
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot delete USC candidates.",
          },
          { status: 403 }
        );
      }
      if (candidateToDelete.position.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC mod
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error: "Forbidden: USC moderators cannot delete CSC candidates.",
              candidatePositionType: candidateToDelete.position.type,
              moderatorCollege: session.user.college,
              candidateDetails: {
                name: `${candidateToDelete.firstName} ${candidateToDelete.lastName}`,
                position: candidateToDelete.position.name,
              },
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot delete CSC candidates.",
            },
            { status: 403 }
          );
        }
        if (candidateToDelete.position.college !== session.user.college) {
          // College mod, wrong college
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
            status: AuditLogStatus.FAILURE,
            entityType: "Candidate",
            entityId: candidateId,
            details: {
              error: "Forbidden: Cannot delete candidates for another college.",
              candidatePositionCollege: candidateToDelete.position.college,
              moderatorCollege: session.user.college,
              candidateDetails: {
                name: `${candidateToDelete.firstName} ${candidateToDelete.lastName}`,
                position: candidateToDelete.position.name,
              },
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: Cannot delete candidates for another college.",
            },
            { status: 403 }
          );
        }
      }
    }

    // Attempt to delete the candidate
    await prisma.candidate.delete({
      where: { id: candidateId },
    });

    // Log successful deletion
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Candidate",
      entityId: candidateToDelete.id, // Use the ID of the deleted candidate
      details: {
        candidateId: candidateToDelete.id,
        candidateName: `${candidateToDelete.firstName} ${candidateToDelete.lastName}`,
        electionId: candidateToDelete.electionId,
        positionId: candidateToDelete.positionId,
        partylistId: candidateToDelete.partylistId,
        isIndependent: candidateToDelete.isIndependent,
        positionName: candidateToDelete.position.name,
        partylistName: candidateToDelete.partylist?.name || "N/A",
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(
      { message: "Candidate deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting candidate ${candidateId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Candidate",
      entityId: candidateId || "unknown",
      details: {
        error: error.message,
        errorCode: error.code, // Include Prisma error code if available
        candidateId: candidateId || "unknown", // Re-add for context
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    if (error.code === "P2025") {
      // Record to delete not found (though already checked by findUnique)
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }
    if (error.code === "P2003") {
      // Foreign key constraint violation (e.g., has associated votes)
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          error: "Cannot delete candidate due to existing votes.",
          errorCode: error.code,
          candidateId,
          // If candidateToDelete was populated, add relevant details here
          // candidateName: candidateToDelete?.firstName + " " + candidateToDelete?.lastName,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Cannot delete this candidate as they have received votes. Consider an alternative action like disqualification if needed.",
        },
        { status: 409 } // 409 Conflict is appropriate
      );
    }
    return NextResponse.json(
      { error: `Failed to delete candidate. Please check logs.` },
      { status: 500 }
    );
  }
}
