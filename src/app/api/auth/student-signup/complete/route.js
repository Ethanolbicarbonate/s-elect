// app/api/auth/student-signup/complete/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const roundsOfHashing = 10;

export async function POST(request) {
  try {
    const { email, token, password, confirmPassword } = await request.json();

    if (!email || !token || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (password.length < 8) { // Add password complexity rules if needed
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { email: email },
    });

    if (!student) {
      return NextResponse.json({ error: 'Invalid email or token.' }, { status: 400 });
    }

    if (student.verificationToken !== token) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (student.verificationExpires && new Date() > student.verificationExpires) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // All checks passed, hash password and update student
    const hashedPassword = await bcrypt.hash(password, roundsOfHashing);

    await prisma.student.update({
      where: { email: email },
      data: {
        password: hashedPassword,
        emailVerified: new Date(), // Mark email as verified
        verificationToken: null,   // Clear token
        verificationExpires: null,
      },
    });

    return NextResponse.json({ message: 'Sign-up successful! You can now log in.' }, { status: 200 });

  } catch (error) {
    console.error('Sign-up completion error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}