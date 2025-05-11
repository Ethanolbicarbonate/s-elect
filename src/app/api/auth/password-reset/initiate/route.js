// src/app/api/auth/password-reset/initiate/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email, userType } = await request.json(); // userType can be 'student' or 'admin'

    if (!email || !userType) {
      return NextResponse.json({ error: 'Email and user type are required.' }, { status: 400 });
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

    if (!user) {
      // Avoid revealing if an email exists or not for security, but for this school project, it might be acceptable.
      // For higher security, always return a generic message.
      return NextResponse.json({ error: 'If an account with this email exists, a password reset OTP has been sent.' }, { status: 200 }); // Or 404 if you want to indicate not found
    }

    // For students, ensure they have completed initial signup (i.e., have a password and verified email)
    if (userType === 'student' && (!user.password || !user.emailVerified)) {
        return NextResponse.json({ error: 'Account setup not complete. Please complete sign-up or verify your email first.' }, { status: 403 });
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

    const emailResult = await sendPasswordResetEmail(normalizedEmail, passwordResetToken, userType);

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
      // Don't reveal specific email sending errors to the client
      return NextResponse.json({ error: 'Could not send password reset instructions. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'If your email is registered, a password reset OTP has been sent.' }, { status: 200 });

  } catch (error) {
    console.error('Password reset initiation error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}