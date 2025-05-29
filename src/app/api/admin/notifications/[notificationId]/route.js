// src/app/api/admin/notifications/[notificationId]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus } from "@prisma/client";

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const ipAddress = getIpAddressFromRequest(request);
  const { notificationId } = params;

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Notification",
      entityId: notificationId || "unknown",
      details: { error: "Forbidden: Insufficient privileges." },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  if (!notificationId) {
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Notification",
      entityId: notificationId || "unknown",
      details: { error: "Notification ID is required." },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Notification ID is required." },
      { status: 400 }
    );
  }

  try {
    const notificationToDelete = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notificationToDelete) {
      await logAdminActivity({
        session,
        actionType: AUDIT_ACTION_TYPES.NOTIFICATION_DELETED,
        status: AuditLogStatus.FAILURE,
        entityType: "Notification",
        entityId: notificationId,
        details: { error: "Notification not found." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    await prisma.notification.delete({ where: { id: notificationId } });

    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_DELETED,
      status: AuditLogStatus.SUCCESS,
      entityType: "Notification",
      entityId: notificationToDelete.id,
      details: {
        title: notificationToDelete.title,
        contentPreview: notificationToDelete.content.substring(0, 100) + "...",
      },
      ipAddress,
    });
    return NextResponse.json(
      { message: "Notification deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.NOTIFICATION_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "Notification",
      entityId: notificationId,
      details: { error: error.message },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Failed to delete notification." },
      { status: 500 }
    );
  }
}
