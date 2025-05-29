// src/app/api/student/vote-status/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed      

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: "Forbidden: Student access only." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get('electionId');
  const studentId = session.user.id;

  if (!electionId) {
    return NextResponse.json({ error: "Election ID is required." }, { status: 400 });
  }

  try {

    const voteRecord = await prisma.studentElectionVote.findUnique({
      where: {
        studentId_electionId: { // This depends on your @@unique constraint name in Prisma
          studentId: studentId,
          electionId: electionId,
        },
      },
    });
    
    // Using Option A:
    return NextResponse.json({ hasVoted: !!voteRecord }, { status: 200 });

  } catch (error) {
    console.error("Error checking vote status:", error);
    return NextResponse.json({ error: "Failed to check vote status." }, { status: 500 });
  }
}