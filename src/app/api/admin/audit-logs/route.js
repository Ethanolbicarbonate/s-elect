import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  AuditActorType,
  AuditActionType,
  AuditLogStatus,
} from "@prisma/client";

const DEFAULT_PAGE_LIMIT = 20;

export async function GET(request) {
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN and AUDITOR can view audit logs
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(
    searchParams.get("limit") || DEFAULT_PAGE_LIMIT.toString(),
    10
  );
  const actorTypeFilter = searchParams.get("actorType"); // e.g., ADMIN, STUDENT, SYSTEM
  const actionTypeFilter = searchParams.get("actionType"); // e.g., ELECTION_CREATED
  const entityTypeFilter = searchParams.get("entityType"); // e.g., Election
  const entityIdFilter = searchParams.get("entityId");
  const actorEmailFilter = searchParams.get("actorEmail"); // Search by actor's email
  const dateStartFilter = searchParams.get("dateStart"); // ISO Date string: YYYY-MM-DD
  const dateEndFilter = searchParams.get("dateEnd"); // ISO Date string: YYYY-MM-DD
  const statusFilter = searchParams.get("status"); // NEW: Get status filter

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters." },
      { status: 400 }
    );
  }

  const skip = (page - 1) * limit;

  const whereClause = {};

  if (
    actorTypeFilter &&
    Object.values(AuditActorType).includes(actorTypeFilter)
  ) {
    whereClause.actorType = actorTypeFilter;
  }
  if (actionTypeFilter) {
    // Assuming actionType is string. If enum, validate against Object.values(AuditActionType)
    whereClause.actionType = actionTypeFilter;
  }
  if (entityTypeFilter) {
    whereClause.entityType = entityTypeFilter;
  }
  if (entityIdFilter) {
    whereClause.entityId = entityIdFilter;
  }
  if (actorEmailFilter) {
    whereClause.actorEmail = {
      contains: actorEmailFilter,
      mode: "insensitive",
    };
  }
  // NEW: Add status filter
  if (statusFilter && Object.values(AuditLogStatus).includes(statusFilter)) {
    whereClause.status = statusFilter;
  }

  if (dateStartFilter) {
    try {
      const startDate = new Date(dateStartFilter);
      startDate.setUTCHours(0, 0, 0, 0); // Start of the day in UTC
      whereClause.timestamp = { ...whereClause.timestamp, gte: startDate };
    } catch (e) {
      // Log the error for debugging purposes, but gracefully continue
      console.warn(`Invalid dateStartFilter provided: ${dateStartFilter}`, e);
      // Don't add to whereClause if invalid, so no filter is applied for this date
    }
  }
  if (dateEndFilter) {
    try {
      const endDate = new Date(dateEndFilter);
      endDate.setUTCHours(23, 59, 59, 999); // End of the day in UTC
      whereClause.timestamp = { ...whereClause.timestamp, lte: endDate };
    } catch (e) {
      // Log the error for debugging purposes, but gracefully continue
      console.warn(`Invalid dateEndFilter provided: ${dateEndFilter}`, e);
      // Don't add to whereClause if invalid, so no filter is applied for this date
    }
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: {
        timestamp: "desc", // Show newest logs first
      },
    });

    const totalRecords = await prisma.auditLog.count({ where: whereClause }); // This was already correct

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json(
      {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          limit,
          totalRecords,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}
