// src/app/api/feedback/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendFeedbackEmail } from "@/lib/emailService"; // <<< Create this function
import { writeAuditLog, getIpAddressFromRequest } from "@/lib/auditLogger"; // Assuming audit logging
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions"; // Assuming audit actions
import { AuditActorType, AuditLogStatus } from "@prisma/client"; // Assuming enums

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const ipAddress = getIpAddressFromRequest(request);
  let requestDataForLog;

  // Authentication check
  if (
    !session ||
    !session.user ||
    session.user.role !== "STUDENT" ||
    !session.user.email
  ) {
    // Log attempt even if not logged in or not student
    await writeAuditLog({
      actorType:
        session?.user?.role === "STUDENT"
          ? AuditActorType.STUDENT
          : AuditActorType.UNKNOWN,
      actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED, // Define this action type
      status: AuditLogStatus.FAILURE,
      details: {
        error: "Forbidden: Authentication required or not a student.",
      },
      ipAddress,
    });
    return NextResponse.json(
      { error: "You must be logged in as a student to submit feedback." },
      { status: 403 }
    );
  }

  const studentEmail = session.user.email;
  const studentId = session.user.id; // Optional: log student ID

  try {
    requestDataForLog = await request.json();
    const { content, title } = requestDataForLog; // Allow optional title from form

    if (!content || content.trim() === "") {
      await writeAuditLog({
        session,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        targetUserId: studentId,
        targetUserEmail: studentEmail,
        details: {
          error: "Content is required.",
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Feedback content cannot be empty." },
        { status: 400 }
      );
    }

    // --- Send Email ---
    // You'll need to implement sendFeedbackEmail in your emailService
    // It should send from studentEmail to your supportEmail
    const emailResult = await sendFeedbackEmail({
      from: studentEmail, // Sender is the student
      to: supportEmail, // Your support email
      subject: `sELECT Feedback${title ? `: ${title}` : ""}`, // Subject includes optional title
      text: `Feedback from ${studentEmail} (ID: ${
        studentId || "N/A"
      }):\n\n${content.trim()}`, // Email body
      // You might want an HTML body too
    });

    if (!emailResult.success) {
      console.error("Failed to send feedback email:", emailResult.error);
      await writeAuditLog({
        session,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
        status: AuditLogStatus.FAILURE,
        targetUserId: studentId,
        targetUserEmail: studentEmail,
        details: {
          error: "Failed to send email.",
          emailServiceError: emailResult.error,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Failed to send feedback email. Please try again later." },
        { status: 500 }
      );
    }

    // Audit Log for successful submission
    await writeAuditLog({
      session,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
      status: AuditLogStatus.SUCCESS,
      targetUserId: studentId,
      targetUserEmail: studentEmail,
      details: {
        message: "Feedback email sent.",
        contentPreview: content.trim().substring(0, 100) + "...",
      },
      ipAddress,
    });

    return NextResponse.json(
      { message: "Feedback sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Feedback API Error:", error);
    await writeAuditLog({
      session,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
      status: AuditLogStatus.FAILURE,
      targetUserId: studentId,
      targetUserEmail: studentEmail,
      details: { error: error.message || "An unexpected error occurred." },
      ipAddress,
    });
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
