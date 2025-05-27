// src/app/api/auth/password-reset/complete/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { writeAuditLog, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditActorType, AuditLogStatus } from "@prisma/client";

const prisma = new PrismaClient();
const roundsOfHashing = 10;

export async function POST(request) {
  const ipAddress = getIpAddressFromRequest(request);
  let requestDataForLog;

  try {
    requestDataForLog = await request.json();
    const { email, userType, token, newPassword, confirmNewPassword } =
      requestDataForLog;

    if (!email || !userType || !token || !newPassword || !confirmNewPassword) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email || "unknown",
        details: {
          error: "Missing required fields.",
          providedData: requestDataForLog, // Log only relevant parts if password is too sensitive for logs
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmNewPassword) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN, // User type not yet confirmed
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email,
        details: { error: "New passwords do not match." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email,
        details: { error: "Password must be at least 8 characters long." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
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
    } else if (userType === "admin") {
      user = await prisma.admin.findUnique({
        where: { email: normalizedEmail },
      });
      userModel = prisma.admin;
    } else {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: normalizedEmail,
        details: { error: "Invalid user type.", providedUserType: userType },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid user type." },
        { status: 400 }
      );
    }

    if (!user || user.passwordResetToken !== token) {
      await writeAuditLog({
        actorType: actorTypeForLog || AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserId: user?.id, // If user exists but token wrong
        targetUserEmail: normalizedEmail,
        details: {
          error: "Invalid or mismatched password reset token.",
          reason: !user ? "User not found" : "Token mismatch",
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid or expired password reset token. Please try again." },
        { status: 400 }
      );
    }

    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      await writeAuditLog({
        actorId: user.id,
        actorEmail: user.email,
        actorType: actorTypeForLog,
        actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserId: user.id,
        targetUserEmail: user.email,
        details: {
          error: "Password reset token has expired.",
          tokenExpiry: user.passwordResetExpires.toISOString(),
        },
        ipAddress,
      });
      // Clear expired token
      await userModel.update({
        where: { email: normalizedEmail },
        data: { passwordResetToken: null, passwordResetExpires: null },
      });
      return NextResponse.json(
        {
          error: "Password reset token has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, roundsOfHashing);

    await userModel.update({
      where: { email: normalizedEmail },
      data: {
        password: hashedPassword,
        passwordResetToken: null, // Clear the token
        passwordResetExpires: null,
        // For students, if they somehow lost their password before verifying email (unlikely with current flow)
        // you might want to re-verify email or just assume they are verified if they reached here.
        // If student.emailVerified was null, consider setting it: emailVerified: new Date()
      },
    });

    // Log successful password reset
    await writeAuditLog({
      actorId: user.id, // User acted upon themselves
      actorEmail: user.email,
      actorType: actorTypeForLog,
      actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
      status: AuditLogStatus.SUCCESS,
      targetUserId: user.id,
      targetUserEmail: user.email,
      details: { message: "Password reset successfully." },
      ipAddress,
    });

    return NextResponse.json(
      {
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset completion error:", error);
    await writeAuditLog({
      actorType: AuditActorType.SYSTEM,
      actionType: AUDIT_ACTION_TYPES.PASSWORD_RESET_COMPLETED,
      status: AuditLogStatus.FAILURE,
      targetUserEmail: requestDataForLog?.email || "unknown",
      details: {
        error: "An unexpected error occurred during password reset completion.",
        errorMessage: error.message,
        requestBodyAttempt: requestDataForLog
          ? JSON.stringify(requestDataForLog) // Be cautious with logging password here, even in stringified form.
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
