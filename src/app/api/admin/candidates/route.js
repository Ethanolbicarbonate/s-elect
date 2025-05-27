import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { College, PositionType } from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

// GET - Fetch candidates, with potential filters (electionId, positionId, college, partylistId)
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("electionId");
  const positionId = searchParams.get("positionId");
  const collegeScope = searchParams.get("college"); // For filtering CSC candidates by college
  const partylistId = searchParams.get("partylistId");
  const candidateScope = searchParams.get("scope"); // 'usc' or 'csc'

  const whereClause = {};
  if (electionId) whereClause.electionId = electionId;
  if (positionId) whereClause.positionId = positionId;
  if (partylistId) whereClause.partylistId = partylistId;

  // Scoping for moderators
  if (session.user.role === "MODERATOR") {
    if (session.user.college) {
      // College Moderator
      // They can only see candidates for their college's CSC positions or USC positions
      // This requires fetching positions first or a more complex query.
      // For simplicity now, if 'collegeScope' is provided and matches, allow.
      // Or, if 'scope=csc' and 'college=THEIR_COLLEGE'
      if (candidateScope === "csc" && collegeScope === session.user.college) {
        // Ensure we are fetching candidates whose position is of type CSC and matches the college
        whereClause.position = {
          type: PositionType.CSC,
          college: session.user.college,
        };
      } else if (candidateScope === "usc") {
        whereClause.position = {
          type: PositionType.USC,
        };
      } else if (collegeScope && collegeScope !== session.user.college) {
        // Moderator trying to access candidates outside their college scope for CSC
        return NextResponse.json(
          { error: "Forbidden: Access to this college scope is restricted." },
          { status: 403 }
        );
      } else if (!candidateScope && !collegeScope) {
        // If no scope, a college mod by default might see their college's candidates
        whereClause.position = {
          college: session.user.college, // Show their CSC candidates by default
        };
      }
    } else {
      // USC Moderator (college is null)
      // Can only see candidates for USC positions
      whereClause.position = { type: PositionType.USC };
    }
  }
  // SuperAdmin and Auditor can see all if no specific filters are applied by them.

  try {
    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        position: true, // Include position details
        partylist: true, // Include partylist details
        // student: true, // Include student details if linked
      },
      orderBy: [
        { position: { order: "asc" } }, // Order by position's order
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });
    return NextResponse.json(candidates, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidates." },
      { status: 500 }
    );
  }
}

// POST - Create a new candidate
export async function POST(request) {
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
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
      status: AuditLogStatus.FAILURE,
      details: {
        error: "Forbidden: Insufficient privileges.",
        // No entityId yet as creation failed before even finding one
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requestDataForLog = await request.json(); // Store incoming data
    const data = requestDataForLog;
    const {
      firstName,
      lastName,
      middleName,
      nickname,
      photoUrl,
      bio,
      platformPoints,
      isIndependent,
      electionId,
      positionId,
      partylistId,
    } = data;

    if (!firstName || !lastName || !electionId || !positionId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Missing required fields",
          electionId,
          positionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Missing required fields: firstName, lastName, electionId, positionId.",
        },
        { status: 400 }
      );
    }
    if (!isIndependent && !partylistId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Partylist ID is required if candidate is not independent.",
          electionId,
          positionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Partylist ID is required if candidate is not independent." },
        { status: 400 }
      );
    }
    if (isIndependent && partylistId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Independent candidate cannot be assigned to a partylist.",
          electionId,
          positionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Independent candidate cannot be assigned to a partylist." },
        { status: 400 }
      );
    }

    // Validate election and position exist
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Selected election not found.",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Selected election not found." },
        { status: 404 }
      );
    }

    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });
    if (!position || position.electionId !== electionId) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error:
            "Selected position not found or does not belong to this election.",
          electionId,
          positionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Selected position not found or does not belong to this election.",
        },
        { status: 404 }
      );
    }

    if (election.scopeType === "USC" && position.type === "CSC") {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error:
            "Scope mismatch: Cannot add candidate to CSC position in USC election.",
          electionId,
          positionId,
          electionScope: election.scopeType,
          positionType: position.type,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Cannot add candidate to a CSC position within a USC-scoped election.",
        },
        { status: 400 }
      );
    }
    if (election.scopeType === "CSC" && position.type === "USC") {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error:
            "Scope mismatch: Cannot add candidate to USC position in CSC election.",
          electionId,
          positionId,
          electionScope: election.scopeType,
          positionType: position.type,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error:
            "Cannot add candidate to a USC position within a CSC-scoped election.",
        },
        { status: 400 }
      );
    }

    // Authorization: Check if moderator is allowed to add to this position
    if (session.user.role === "MODERATOR") {
      if (position.type === PositionType.USC && session.user.college !== null) {
        // College mod trying to add to USC
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error:
              "Forbidden: College moderators cannot add candidates to USC positions.",
            electionId,
            positionId,
            positionType: position.type,
            moderatorCollege: session.user.college,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot add candidates to USC positions.",
          },
          { status: 403 }
        );
      }
      if (position.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC mod trying to add to CSC
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error:
                "Forbidden: USC moderators cannot add candidates to CSC positions.",
              electionId,
              positionId,
              positionType: position.type,
              moderatorCollege: session.user.college,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error:
                "Forbidden: USC moderators cannot add candidates to CSC positions.",
            },
            { status: 403 }
          );
        }
        if (position.college !== session.user.college) {
          // College mod trying to add to another college's CSC
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error:
                "Forbidden: Cannot add candidates to a different college's CSC position.",
              electionId,
              positionId,
              positionCollege: position.college,
              moderatorCollege: session.user.college,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error:
                "Forbidden: Cannot add candidates to a different college's CSC position.",
            },
            { status: 403 }
          );
        }
      }
    }

    // Validate Partylist if provided (and not independent)
    let partylist = null;
    if (!isIndependent && partylistId) {
      partylist = await prisma.partylist.findUnique({
        where: { id: partylistId },
      });
      if (!partylist || partylist.electionId !== electionId) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "Partylist not found or does not belong to this election.",
            electionId,
            partylistId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Partylist not found or does not belong to this election." },
          { status: 404 }
        );
      }
      // Additionally, ensure partylist scope matches position scope
      if (partylist.type !== position.type) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "Partylist type does not match position type.",
            electionId,
            positionId,
            partylistId,
            partylistType: partylist.type,
            positionType: position.type,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Partylist type must match position type." },
          { status: 400 }
        );
      }
      if (
        partylist.type === PositionType.CSC &&
        partylist.college !== position.college
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "Partylist college does not match position college.",
            electionId,
            positionId,
            partylistId,
            partylistCollege: partylist.college,
            positionCollege: position.college,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Partylist college must match position college for CSC." },
          { status: 400 }
        );
      }
    }

    // Business Logic: Max 1 candidate per partylist per position (except for Councilor types)
    if (!isIndependent && partylistId && position.maxVotesAllowed === 1) {
      const existingCandidate = await prisma.candidate.findFirst({
        where: {
          electionId,
          positionId,
          partylistId,
          // Candidate ID is not part of this check for creation
        },
      });
      if (existingCandidate) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error:
              "Partylist already has a candidate for this single-vote position.",
            electionId,
            positionId,
            partylistId,
            positionName: position.name,
            partylistName: partylist?.name,
            existingCandidateId: existingCandidate.id,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: `This partylist already has a candidate for the position of ${position.name}.`,
          },
          { status: 409 }
        );
      }
    }

    const candidate = await prisma.candidate.create({
      data: {
        firstName,
        lastName,
        middleName,
        nickname,
        photoUrl,
        bio,
        platformPoints: Array.isArray(platformPoints)
          ? platformPoints
          : platformPoints
          ? [platformPoints]
          : [],
        isIndependent: isIndependent || false,
        electionId,
        positionId,
        partylistId: isIndependent ? null : partylistId,
      },
    });

    // Log successful creation
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Candidate",
      entityId: candidate.id,
      details: {
        electionId,
        positionId,
        partylistId: candidate.partylistId,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        isIndependent: candidate.isIndependent,
        positionName: position.name,
        partylistName: partylist?.name || "N/A",
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error) {
    console.error("Error creating candidate:", error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.CANDIDATE_CREATED,
      status: AuditLogStatus.FAILURE,
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
    // Add specific error handling for unique constraints if needed
    // if (error.code === "P2002") { // For cases like unique constraint on name+position+election
    //   return NextResponse.json({ error: "A candidate with this name already exists for this position/election." }, { status: 409 });
    // }
    return NextResponse.json(
      { error: `Failed to create candidate. Please check logs.` },
      { status: 500 }
    );
  }
}
