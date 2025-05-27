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
    const { email, token, password, confirmPassword } = requestDataForLog;

    if (!email || !token || !password || !confirmPassword) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email || "unknown",
        details: {
          error: "Missing required fields.",
          // logging only which fields were missing.
          providedDataSummary: {
            emailProvided: !!email,
            tokenProvided: !!token,
            passwordProvided: !!password,
            confirmPasswordProvided: !!confirmPassword,
          },
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN, // User not yet fully authenticated/identified
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email,
        details: { error: "Passwords do not match." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: email,
        details: { error: "Password must be at least 8 characters long." },
        ipAddress,
      });
      // password complexity rules
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const student = await prisma.student.findUnique({
      where: { email: normalizedEmail },
    });

    if (!student) {
      await writeAuditLog({
        actorType: AuditActorType.UNKNOWN,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserEmail: normalizedEmail,
        details: {
          error: "Student record not found for this email.",
          tokenProvided: token, // Log the token they tried to use
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid email or token." },
        { status: 400 }
      );
    }

    if (student.verificationToken !== token) {
      await writeAuditLog({
        actorId: student.id,
        actorEmail: student.email,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserId: student.id,
        targetUserEmail: student.email,
        details: {
          error: "Invalid verification code.",
          studentId: student.id,
          // Do NOT log student.verificationToken here if it's sensitive (e.g. plain text)
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    if (
      student.verificationExpires &&
      new Date() > student.verificationExpires
    ) {
      await writeAuditLog({
        actorId: student.id,
        actorEmail: student.email,
        actorType: AuditActorType.STUDENT,
        actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
        status: AuditLogStatus.FAILURE,
        targetUserId: student.id,
        targetUserEmail: student.email,
        details: {
          error: "Verification code has expired.",
          studentId: student.id,
          tokenExpiry: student.verificationExpires.toISOString(),
        },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // All checks passed, hash password and update student
    const hashedPassword = await bcrypt.hash(password, roundsOfHashing);

    await prisma.student.update({
      where: { email: email },
      data: {
        password: hashedPassword,
        emailVerified: new Date(), // Mark email as verified
        verificationToken: null, // Clear token
        verificationExpires: null,
      },
    });

    await writeAuditLog({
      actorId: student.id, // Student is acting on their own account
      actorEmail: student.email,
      actorType: AuditActorType.STUDENT,
      actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED, // This is akin to USER_CREATED
      status: AuditLogStatus.SUCCESS,
      targetUserId: student.id, // The user who was created/activated
      targetUserEmail: student.email,
      details: {
        message: "Student sign-up completed successfully.",
        studentId: student.id,
      },
      ipAddress,
    });

    return NextResponse.json(
      { message: "Sign-up successful! You can now log in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sign-up completion error:", error);
    await writeAuditLog({
      actorType: AuditActorType.SYSTEM,
      actionType: AUDIT_ACTION_TYPES.STUDENT_SIGNUP_COMPLETED,
      status: AuditLogStatus.FAILURE,
      targetUserEmail: requestDataForLog?.email || "unknown",
      details: {
        error: "An unexpected error occurred during sign-up completion.",
        errorMessage: error.message,
        requestBodyAttemptSummary: requestDataForLog
          ? JSON.stringify({
              email: requestDataForLog.email,
              tokenProvided: !!requestDataForLog.token,
            }) // Redact password from log
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
