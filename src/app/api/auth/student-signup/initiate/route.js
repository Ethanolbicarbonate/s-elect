import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { writeAuditLog, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditActorType, AuditLogStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  const ipAddress = getIpAddressFromRequest(request);
  let requestDataForLog;

  try {
    requestDataForLog = await request.json();
    const { email } = requestDataForLog;

    if (!email || !email.endsWith("@wvsu.edu.ph")) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN, // At this stage, the actor is unknown
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email || "unknown",
        details: {
          error: "Invalid WVSU email format.",
          providedEmail: email,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid WVSU email format." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const student = await prisma.student.findUnique({
      where: { email: normalizedEmail },
    });

    if (!student) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN, // Not a known student yet
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: normalizedEmail,
        details: {
          error: "Email not found in pre-approved student list.",
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error:
            "This email is not registered in our system as an enrolled student.",
        },
        { status: 404 }
      );
    }

    if (!student.isPreApproved) {
      await writeAuditLog({
        actorId: student.id,
        actorEmail: student.email,
        actorType: AuditActorType.STUDENT, // Identified as a student
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserId: student.id,
        targetUserEmail: student.email,
        details: {
          error: "Account is not pre-approved for sign-up.",
          studentId: student.id,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "This account is not currently eligible for sign-up." },
        { status: 403 }
      );
    }

    if (student.password && student.emailVerified) {
      // Check if already signed up and verified
      await writeAuditLog({
        actorId: student.id,
        actorEmail: student.email,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserId: student.id,
        targetUserEmail: student.email,
        details: {
          error: "Account already signed up and verified.",
          studentId: student.id,
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error:
            "This email has already completed the sign-up process. Please log in.",
        },
        { status: 409 }
      );
    }

    // Generate a 6-digit OTP
    const verificationToken = crypto.randomInt(100000, 999999).toString();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.student.update({
      where: { email: email },
      data: {
        verificationToken: verificationToken,
        verificationExpires: verificationExpires,
        emailVerified: null, // Reset verification status if they are re-initiating
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      // Log the detailed error server-side
      console.error(
        "Failed to send verification email for student signup:",
        emailResult.error
      );
      await writeAuditLog({
        actorId: student.id,
        actorEmail: student.email,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserId: student.id,
        targetUserEmail: student.email,
        details: {
          error: "Failed to send verification email.",
          emailServiceError: emailResult.error,
          studentId: student.id,
        },
        ipAddress,
      });
      // Return a generic error to the client
      return NextResponse.json(
        { error: "Could not send verification email. Please try again later." },
        { status: 500 }
      );
    }
    await writeAuditLog({
      actorId: student.id,
      actorEmail: student.email,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
      status: AuditLogStatus.SUCCESS,
      targetUserId: student.id,
      targetUserEmail: student.email,
      details: {
        message: "Verification code sent successfully.",
        studentId: student.id,
      },
      ipAddress,
    });

    return NextResponse.json(
      {
        message:
          "Verification code sent to your email. Please check your inbox (and spam folder).",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sign-up initiation error:", error);
    await writeAuditLog({
      actorType: AuditActorType.SYSTEM,
      actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_INITIATED,
      status: AuditLogStatus.FAILURE,
      targetUserEmail: requestDataForLog?.email || "unknown",
      details: {
        error: "An unexpected error occurred during sign-up initiation.",
        errorMessage: error.message,
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog)
          : "Body not available/parsed",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      ipAddress,
    });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
