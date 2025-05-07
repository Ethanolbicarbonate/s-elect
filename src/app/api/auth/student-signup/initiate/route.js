// app/api/auth/student-signup/initiate/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email'; // Adjust path if needed

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.endsWith('@wvsu.edu.ph')) {
      return NextResponse.json({ error: 'Invalid WVSU email format.' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { email: email },
    });

    if (!student) {
      return NextResponse.json({ error: 'This email is not registered in our system as an enrolled student.' }, { status: 404 });
    }

    if (!student.isPreApproved) {
        return NextResponse.json({ error: 'This account is not currently eligible for sign-up.' }, { status: 403 });
    }

    if (student.password && student.emailVerified) { // Check if already signed up and verified
      return NextResponse.json({ error: 'This email has already completed the sign-up process. Please log in.' }, { status: 409 });
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
        console.error("Failed to send verification email for student signup:", emailResult.error);
        // Return a generic error to the client
        return NextResponse.json({ error: 'Could not send verification email. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Verification code sent to your email. Please check your inbox (and spam folder).' }, { status: 200 });

  } catch (error) {
    console.error('Sign-up initiation error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}