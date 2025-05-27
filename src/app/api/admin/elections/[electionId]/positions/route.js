import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust this path if necessary
import { PositionType, College } from "@prisma/client"; // Import enums for validation
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

// GET - Fetch all positions for a specific election
export async function GET(request, context) {
  const params = await context.params;
  const { electionId } = params;
  const session = await getServerSession(authOptions);
  // Allow SUPER_ADMIN, MODERATOR, AUDITOR to view positions
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Validate electionId presence (params should always provide it if route matches)
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

    const positions = await prisma.position.findMany({
      where: { electionId: electionId },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(positions, { status: 200 });
  } catch (error) {
    console.error(
      `Error fetching positions for election ${electionId}:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch positions." },
      { status: 500 }
    );
  }
}

// POST - Create a new position for a specific election
export async function POST(request, context) {
  const params = await context.params;
  const { electionId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    // Optional: Log unauthorized attempt.
    // await writeAuditLog({
    //   actorType: AuditActorType.UNKNOWN,
    //   actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
    //   status: AuditLogStatus.FAILURE,
    //   details: { error: "Forbidden", electionId },
    //   ipAddress: getIpAddressFromRequest(request),
    // });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let requestDataForLog;

  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: { error: "Election not found", electionId },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    const data = await request.json();
    requestDataForLog = data;
    const {
      name,
      description,
      type,
      college,
      maxVotesAllowed,
      minVotesRequired,
      order,
    } = data;

    if (
      !name ||
      !type ||
      maxVotesAllowed === undefined ||
      order === undefined
    ) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Missing required fields",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        {
          error: "Missing required fields: name, type, maxVotesAllowed, order.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(PositionType).includes(type)) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Invalid position type",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Invalid position type." },
        { status: 400 }
      );
    }

    if (session.user.role === "MODERATOR") {
      if (type === PositionType.USC) {
        // 'type' is from destructured 'data'
        if (session.user.college !== null) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error: "Forbidden: College mods cannot create USC positions",
              electionId,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error:
                "Forbidden: College moderators cannot create USC positions.",
            },
            { status: 403 }
          );
        }
        data.college = null; // Modify the data object that will be used
      } else if (type === PositionType.CSC) {
        if (session.user.college === null) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error: "Forbidden: USC mods cannot create CSC positions",
              electionId,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            { error: "Forbidden: USC moderators cannot create CSC positions." },
            { status: 403 }
          );
        }
        if (!college || college !== session.user.college) {
          // 'college' is from destructured 'data'
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error: `Forbidden: Moderator scope mismatch for college. Expected ${session.user.college}`,
              electionId,
              providedData: data,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: `Forbidden: You can only create CSC positions for your assigned college (${session.user.college}).`,
            },
            { status: 403 }
          );
        }
        data.college = college; // Already correct
      }
    } else {
      // SUPER_ADMIN
      if (type === PositionType.USC) {
        data.college = null;
      } else if (type === PositionType.CSC && !college) {
        // 'college' is from destructured 'data'
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "College required for CSC position by SA",
            electionId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "College is required for CSC positions." },
          { status: 400 }
        );
      }
      // For SA, data.college from payload is used if type is CSC
    }

    // Checks against election's scope using the modified data.type and data.college
    if (election.scopeType) {
      if (election.scopeType === "USC" && data.type === PositionType.CSC) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "Scope mismatch: CSC position in USC election",
            electionId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: "Cannot create a CSC position within a USC-scoped election.",
          },
          { status: 400 }
        );
      }
      if (election.scopeType === "CSC" && data.type === PositionType.USC) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "Scope mismatch: USC position in CSC election",
            electionId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: "Cannot create a USC position within a CSC-scoped election.",
          },
          { status: 400 }
        );
      }
      if (
        election.scopeType === "CSC" &&
        election.college &&
        data.type === PositionType.CSC &&
        data.college !== election.college
      ) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: `Scope mismatch: Position college ${data.college} vs election college ${election.college}`,
            electionId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          {
            error: `Cannot create a position for college '${data.college}' within an election scoped to college '${election.college}'.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate college if type is CSC
    if (data.type === PositionType.CSC) {
      if (!data.college || !Object.values(College).includes(data.college)) {
        await logAdminActivity({
          session,
          actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
          status: AuditLogStatus.FAILURE,
          details: {
            error: "Invalid college for CSC position",
            electionId,
            providedData: data,
          },
          ipAddress: getIpAddressFromRequest(request),
        });
        return NextResponse.json(
          { error: "Valid college is required for CSC positions." },
          { status: 400 }
        );
      }
    }

    if (parseInt(maxVotesAllowed) < 1) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: { error: "Max votes too low", electionId, providedData: data },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Max votes allowed must be at least 1." },
        { status: 400 }
      );
    }
    // ... (other numeric validations with similar failure logging) ...
    if (minVotesRequired !== undefined && parseInt(minVotesRequired) < 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Min votes negative",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Min votes required cannot be negative." },
        { status: 400 }
      );
    }
    if (
      minVotesRequired !== undefined &&
      parseInt(minVotesRequired) > parseInt(maxVotesAllowed)
    ) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Min votes > Max votes",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Min votes required cannot exceed max votes allowed." },
        { status: 400 }
      );
    }

    const newPosition = await prisma.position.create({
      data: {
        name,
        description,
        type,
        college: data.college,
        maxVotesAllowed: parseInt(maxVotesAllowed),
        minVotesRequired: parseInt(minVotesRequired) || 0,
        order: parseInt(order),
        electionId: electionId,
      },
    });

    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Position",
      entityId: newPosition.id,
      details: {
        electionId,
        name: newPosition.name,
        type: newPosition.type,
        college: newPosition.college,
        order: newPosition.order,
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(newPosition, { status: 201 });
  } catch (error) {
    console.error(`Error creating position for election ${electionId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.POSITION_CREATED,
      status: AuditLogStatus.FAILURE,
      details: {
        electionId,
        error: error.message,
        // requestBody: requestDataForLog || "Could not read/store body", // Use stored requestDataForLog
        // Note: Storing full request body can be large. For text() it needs to be awaited.
        // If error is due to parsing, text() might fail.
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Stack in dev
      },
      ipAddress: getIpAddressFromRequest(request),
    });
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A position with this name (and college, if CSC) already exists for this election.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create position. Please check logs.` },
      { status: 500 }
    );
  }
}
