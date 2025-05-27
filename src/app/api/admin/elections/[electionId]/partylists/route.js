// src/app/api/admin/elections/[electionId]/partylists/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType, College } from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

// GET - Fetch all partylists for a specific election
export async function GET(request, context) {
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
  let requestDataForLog; // Variable to store incoming data for error logging

  // Initial Forbidden Check
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session: session, // Will be null if unauthorized
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
      status: AuditLogStatus.FAILURE,
      details: {
        error: "Forbidden: Insufficient privileges.",
        electionId: electionId || "unknown",
      },
      ipAddress: getIpAddressFromRequest(request),
    });
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
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
        status: AuditLogStatus.FAILURE,
        details: { error: "Election not found", electionId },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    requestDataForLog = await request.json(); // Store incoming data
    const data = requestDataForLog;
    const { name, acronym, logoUrl, platform, type, college } = data;

    // 1. Validate required fields & enums
    if (!name || !type) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Missing required fields: name, type.",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
      return NextResponse.json(
        { error: "Missing required fields: name, type." },
        { status: 400 }
      );
    }
    if (!Object.values(PositionType).includes(type)) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Invalid partylist type.",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
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
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Valid college is required for CSC partylists.",
          electionId,
          providedData: data,
        },
        ipAddress: getIpAddressFromRequest(request),
      });
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
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error:
                "Forbidden: College moderators cannot create USC partylists.",
              electionId,
              providedData: data,
              moderatorCollege: session.user.college,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
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
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error: "Forbidden: USC moderators cannot create CSC partylists.",
              electionId,
              providedData: data,
              moderatorCollege: session.user.college,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot create CSC partylists.",
            },
            { status: 403 }
          );
        }
        // College Mod creating CSC partylist: 'collegeToSave' must match their assigned college
        if (collegeToSave !== session.user.college) {
          await logAdminActivity({
            session,
            actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
            status: AuditLogStatus.FAILURE,
            details: {
              error: `Forbidden: Moderator cannot create CSC partylist for another college.`,
              electionId,
              providedData: data,
              moderatorCollege: session.user.college,
              providedCollege: collegeToSave,
            },
            ipAddress: getIpAddressFromRequest(request),
          });
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

    // Log successful creation
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Partylist",
      entityId: newPartylist.id,
      details: {
        electionId,
        name: newPartylist.name,
        acronym: newPartylist.acronym,
        type: newPartylist.type,
        college: newPartylist.college,
      },
      ipAddress: getIpAddressFromRequest(request),
    });

    return NextResponse.json(newPartylist, { status: 201 });
  } catch (error) {
    console.error(
      `Error creating partylist for election ${electionId}:`,
      error
    );
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.PARTYLIST_CREATED,
      status: AuditLogStatus.FAILURE,
      details: {
        electionId,
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
          error: `A partylist with these details (${targetFields}) already exists for this election. Please use a different name, type, or college combination.`,
        },
        { status: 409 } // 409 Conflict
      );
    }
    return NextResponse.json(
      { error: `Failed to create partylist. Please check logs.` },
      { status: 500 }
    );
  }
}
