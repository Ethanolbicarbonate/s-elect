import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus, AuditActorType } from "@prisma/client";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const ipAddress = getIpAddressFromRequest(request);
  let requestDataForLog;

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_CREATED,
      status: AuditLogStatus.FAILURE,
      details: { error: "Forbidden: Insufficient privileges." },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    requestDataForLog = await request.json();
    const { title, content } = requestDataForLog;

    if (!content || content.trim() === "") {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.NOTIFICATION_CREATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Content is required.",
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        title: title?.trim() || null, // Save null if empty after trim
        content: content.trim(),
      },
    });

    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_CREATED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Notification",
      entityId: notification.id,
      details: {
        title: notification.title,
        contentPreview: notification.content.substring(0, 100) + "...",
      },
      ipAddress,
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_CREATED,
      status: AuditLogStatus.FAILURE,
      details: { error: error.message, requestBodyAttempt: requestDataForLog },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Failed to create notification." },
      { status: 500 }
    );
  }
}
