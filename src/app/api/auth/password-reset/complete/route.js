// src/app/api/auth/password-reset/complete/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const roundsOfHashing = 10;

export async function POST(request) {
  try {
    const { email, userType, token, newPassword, confirmNewPassword } = await request.json();

    if (!email || !userType || !token || !newPassword || !confirmNewPassword) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ error: 'New passwords do not match.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    let user;
    let userModel;

    if (userType === 'student') {
      user = await prisma.student.findUnique({ where: { email: normalizedEmail } });
      userModel = prisma.student;
    } else if (userType === 'admin') {
      user = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
      userModel = prisma.admin;
    } else {
      return NextResponse.json({ error: 'Invalid user type.' }, { status: 400 });
    }

    if (!user || user.passwordResetToken !== token) {
      return NextResponse.json({ error: 'Invalid or expired password reset token. Please try again.' }, { status: 400 });
    }

    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      // Clear expired token
      await userModel.update({
        where: { email: normalizedEmail },
        data: { passwordResetToken: null, passwordResetExpires: null },
      });
      return NextResponse.json({ error: 'Password reset token has expired. Please request a new one.' }, { status: 400 });
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

    return NextResponse.json({ message: 'Password has been reset successfully. You can now log in with your new password.' }, { status: 200 });

  } catch (error) {
    console.error('Password reset completion error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}