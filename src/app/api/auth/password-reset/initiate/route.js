import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { writeAuditLog, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditActorType, AuditLogStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  const ipAddress = getIpAddressFromRequest(request);
  let requestDataForLog;
  try {
    requestDataForLog = await request.json();
    const { email, userType } = requestDataForLog;

    if (!email || !userType) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN, // No specific actor identified yet
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: "Email and user type are required.",
          providedData: requestDataForLog,
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Email and user type are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    let user;
    let userModel;
    let actorTypeForLog;

    if (userType === "student") {
      user = await prisma.student.findUnique({
        where: { email: normalizedEmail },
      });
      userModel = prisma.student;
      actorTypeForLog = AuditActorType.STUDENT;
    } else if (userType === "admin") {
      user = await prisma.admin.findUnique({
        where: { email: normalizedEmail },
      });
      userModel = prisma.admin;
      actorTypeForLog = AuditActorType.ADMIN;
    } else {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: normalizedEmail, // Log the email attempted
        details: { error: "Invalid user type.", providedUserType: userType },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid user type." },
        { status: 400 }
      );
    }

    if (!user) {
      await writeAuditLog({
        actorType: actorTypeForLog || AuditActorType.UNKNOWN, // Use determined type or UNKNOWN
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
        status: AuditLogStatus.FAILURE, // Technically a failure to find the user
        targetUserEmail: normalizedEmail,
        details: {
          error: "User not found with this email and user type.",
          userTypeAttempted: userType,
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error:
            "If an account with this email exists, a password reset OTP has been sent.",
        },
        { status: 200 }
      ); // Or 404 if you want to indicate not found
    }

    // For students, ensure they have completed initial signup (i.e., have a password and verified email)
    if (userType === "student" && (!user.password || !user.emailVerified)) {
      await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserId: user.id,
        targetUserEmail: user.email,
        details: {
          error: "Account setup not complete or email not verified.",
          userId: user.id,
          emailVerified: user.emailVerified,
          hasPassword: !!user.password,
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error:
            "Account setup not complete. Please complete sign-up or verify your email first.",
        },
        { status: 403 }
      );
    }

    const passwordResetToken = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await userModel.update({
      where: { email: normalizedEmail },
      data: {
        passwordResetToken: passwordResetToken,
        passwordResetExpires: passwordResetExpires,
      },
    });

    const emailResult = await sendPasswordResetEmail(
      normalizedEmail,
      passwordResetToken,
      userType
    );

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email,
        actorType: actorTypeForLog,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
        status: AuditLogStatus.FAILURE,
        targetUserId: user.id,
        targetUserEmail: user.email,
        details: {
          error: "Failed to send password reset email.",
          emailServiceError: emailResult.error, // Log the internal error
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error:
            "Could not send password reset instructions. Please try again later.",
        },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorType: actorTypeForLog,
      actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
      status: AuditLogStatus.SUCCESS,
      targetUserId: user.id,
      targetUserEmail: user.email,
      details: { message: "Password reset OTP sent successfully." },
      ipAddress,
    });

    return NextResponse.json(
      {
        message:
          "If your email is registered, a password reset OTP has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset initiation error:", error);
    await writeAuditLog({
      actorType: AuditActorType.SYSTEM, // Or UNKNOWN if preferred for system errors
      actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_INITIATED,
      status: AuditLogStatus.FAILURE,
      targetUserEmail: requestDataForLog?.email || "unknown",
      details: {
        error: "An unexpected error occurred during password reset initiation.",
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
