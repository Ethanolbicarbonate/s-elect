import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  College,
  ElectionStatus,
  AuditActorType,
  AuditLogStatus,
} from "@prisma/client";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { electionId } = params;
  const ipAddress = getIpAddressFromRequest(request);
  let requestDataForLog;

  if (!session || session.user?.role !== "SUPER_ADMIN") {
    await logAdminActivity({
      session: session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: electionId || "unknown",
      details: {
        error:
          "Forbidden: Insufficient privileges (only SUPER_ADMIN can extend elections).",
        electionId: electionId || "unknown",
      },
      ipAddress,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { colleges, extendedEndDate, reason } = await request.json();

    if (
      !colleges ||
      !Array.isArray(colleges) ||
      colleges.length === 0 ||
      !extendedEndDate
    ) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error:
            "Missing required fields: colleges (array) and extendedEndDate.",
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error:
            "Missing required fields: colleges (array) and extendedEndDate.",
        },
        { status: 400 }
      );
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: { error: "Election not found." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 }
      );
    }

    const newExtendedEndDate = new Date(extendedEndDate);

    if (isNaN(newExtendedEndDate.getTime())) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Invalid date format for extendedEndDate.",
          providedEndDate: extendedEndDate,
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid date format for extendedEndDate." },
        { status: 400 }
      );
    }

    if (newExtendedEndDate <= new Date(election.startDate)) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "Extended end date must be after the election start date.",
          electionStartDate: election.startDate.toISOString(),
          providedExtendedEndDate: extendedEndDate,
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Extended end date must be after the election start date." },
        { status: 400 }
      );
    }

    const validCollegesForOps = [];
    const invalidCollegesProvided = [];

    colleges.forEach((college) => {
      if (Object.values(College).includes(college)) {
        validCollegesForOps.push(college);
      } else {
        invalidCollegesProvided.push(college);
        console.warn(`Invalid college value provided and skipped: ${college}`);
        // Log this specific skipped college for auditing? Could be too noisy.
        // For now, it's implicitly logged in the `invalidCollegesProvided` in success/failure log.
      }
    });

    if (validCollegesForOps.length === 0 && colleges.length > 0) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
        status: AuditLogStatus.FAILURE,
        entityType: "Election",
        entityId: electionId,
        details: {
          error: "No valid colleges provided for extension.",
          providedColleges: colleges, // Log all originally provided colleges
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "No valid colleges provided for extension." },
        { status: 400 }
      );
    }

    const operations = validCollegesForOps.map((college) =>
      prisma.electionExtension.upsert({
        where: { electionId_college: { electionId, college } },
        update: { extendedEndDate: newExtendedEndDate, reason },
        create: {
          electionId,
          college,
          extendedEndDate: newExtendedEndDate,
          reason,
        },
      })
    );

    const results = await prisma.$transaction(operations);

    let mainElectionStatusUpdated = false;
    let oldMainElectionStatus = election.status;

    if (
      election.status === ElectionStatus.ENDED &&
      newExtendedEndDate > new Date()
    ) {
      await prisma.election.update({
        where: { id: electionId },
        data: { status: ElectionStatus.ONGOING }, // Or a special status like "PARTIALLY_EXTENDED"
      });
      mainElectionStatusUpdated = true;
    }

    // Log successful extension
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Election",
      entityId: electionId,
      details: {
        message: `${results.length} college extensions processed.`,
        electionName: election.name,
        targetColleges: validCollegesForOps,
        extendedEndDate: newExtendedEndDate.toISOString(),
        reason: reason,
        invalidCollegesSkipped:
          invalidCollegesProvided.length > 0
            ? invalidCollegesProvided
            : undefined,
        mainElectionStatusChanged: mainElectionStatusUpdated,
        oldMainElectionStatus: mainElectionStatusUpdated
          ? oldMainElectionStatus
          : undefined,
        newMainElectionStatus: mainElectionStatusUpdated
          ? ElectionStatus.ONGOING
          : undefined, // Adjust if you use PARTIALLY_EXTENDED
        // You could include the `results` array if it's not too large and provides value
        // upsertResults: results.map(r => ({ college: r.college, id: r.id }))
      },
      ipAddress,
    });

    return NextResponse.json(
      { message: `${results.length} college extensions processed.`, results },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error extending election ${electionId}:`, error);
    // General catch-all failure log
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.ELECTION_EXTENDED,
      status: AuditLogStatus.FAILURE,
      entityType: "Election",
      entityId: electionId || "unknown",
      details: {
        error: error.message,
        errorCode: error.code,
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      ipAddress,
    });
    return NextResponse.json(
      {
        error:
          "Failed to extend election for specified colleges. Please check logs.",
      },
      { status: 500 }
    );
  }
}
