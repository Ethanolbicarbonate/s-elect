// src/app/api/feedback/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// FIX: Import sendFeedbackEmail from your email library
import { sendFeedbackEmail } from "@/lib/email"; // <<< Use your actual email library path
import { writeAuditLog, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditActorType, AuditLogStatus } from "@prisma/client";

// FIX: Define the support email address from environment variables
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;

// Ensure SUPPORT_EMAIL is configured in production
if (process.env.NODE_ENV === "production" && !SUPPORT_EMAIL) {
  console.error(
    "CRITICAL: SUPPORT_EMAIL environment variable is not set in production."
  );
  // In a real app, you might want to prevent the API from running if this is missing.
  // throw new Error("Support email is not configured.");
}

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
    await writeAuditLog({
      actorType:
        session?.user?.role === "STUDENT"
          ? AuditActorType.STUDENT
          : AuditActorType.UNKNOWN,
      actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
      status: AuditLogStatus.FAILURE,
      // targetUserEmail: session?.user?.email || "unknown", // Use session email if available
      details: {
        error: "Forbidden: Authentication required or not a student.",
        isAuthenticated: !!session,
        userRole: session?.user?.role || "none",
        hasEmailInSession: !!session?.user?.email,
      },
      ipAddress,
    });
    return NextResponse.json(
      { error: "You must be logged in as a student to submit feedback." },
      { status: 403 }
    );
  }

  const studentEmail = session.user.email;
  const studentId = session.user.id;

  // Prevent sending in production if SUPPORT_EMAIL is not set
  if (process.env.NODE_ENV === "production" && !SUPPORT_EMAIL) {
    console.error(
      "Cannot send feedback email: SUPPORT_EMAIL is not configured."
    );
    await writeAuditLog({
      session,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
      status: AuditLogStatus.FAILURE,
      targetUserId: studentId,
      targetUserEmail: studentEmail,
      details: {
        error: "Feedback email not configured in production.",
        envVarMissing: "SUPPORT_EMAIL",
      },
      ipAddress,
    });
    return NextResponse.json(
      {
        error:
          "Feedback functionality is not configured. Please try again later.",
      },
      { status: 500 }
    );
  }

  try {
    requestDataForLog = await request.json();
    const { content, title } = requestDataForLog;

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
    // Use the new sendFeedbackEmail function
    const emailResult = await sendFeedbackEmail({
      from: studentEmail, // Pass student email here to be used as Reply-To
      to: SUPPORT_EMAIL, // Pass the support email (optional, sendFeedbackEmail uses the env var)
      subject: `sELECT Feedback${title ? `: ${title}` : ""}`,
      text: `Feedback from ${studentEmail} (ID: ${
        studentId || "N/A"
      }):\n\n${content.trim()}`,
      // You might want an HTML body too for better formatting
      html: `<p><strong>Feedback from:</strong> ${studentEmail} (ID: ${
        studentId || "N/A"
      })</p><p><strong>Subject:</strong> ${
        title || "No Subject"
      }</p><p><strong>Content:</strong></p><div style="border: 1px solid #eee; padding: 10px; white-space: pre-wrap;">${content.trim()}</div>`,
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

    await writeAuditLog({
      session,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.FEEDBACK_SUBMITTED,
      status: AuditLogStatus.SUCCESS,
      targetUserId: studentId,
      targetUserEmail: studentEmail,
      details: {
        message: "Feedback email sent.",
        // Log a preview, but be cautious about sensitive info
        contentPreview:
          content.trim().substring(0, 100) +
          (content.trim().length > 100 ? "..." : ""),
        subject: title || "No Subject",
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
      details: {
        error: error.message || "An unexpected error occurred.",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      ipAddress,
    });
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
