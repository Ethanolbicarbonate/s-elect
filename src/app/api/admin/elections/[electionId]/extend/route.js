// src/app/api/admin/elections/[electionId]/extend/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { College } from '@prisma/client'; // Import College enum

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  const { electionId } = params;

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { colleges, extendedEndDate, reason } = await request.json();

    if (!colleges || !Array.isArray(colleges) || colleges.length === 0 || !extendedEndDate) {
      return NextResponse.json({ error: 'Missing required fields: colleges (array) and extendedEndDate.' }, { status: 400 });
    }

    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    const newExtendedEndDate = new Date(extendedEndDate);
    if (newExtendedEndDate <= new Date(election.startDate)) {
        return NextResponse.json({ error: 'Extended end date must be after the election start date.' }, { status: 400 });
    }
    if (newExtendedEndDate <= new Date(election.endDate)) {
        // This might be a reduction rather than an extension if not handled carefully.
        // Or an admin might want to set a specific end date for a college that's earlier than general end.
        // For "extension", usually it's > election.endDate.
        console.warn("Extended end date is not later than the general election end date for some colleges.");
    }


    const operations = colleges.map(college => {
      if (!Object.values(College).includes(college)) {
        // Skip invalid college enum values, or throw error
        console.warn(`Invalid college value provided: ${college}`);
        return null; // Or throw error
      }
      return prisma.electionExtension.upsert({
        where: { electionId_college: { electionId, college } },
        update: { extendedEndDate: newExtendedEndDate, reason },
        create: { electionId, college, extendedEndDate: newExtendedEndDate, reason },
      });
    }).filter(op => op !== null); // Filter out any null operations from invalid colleges

    if (operations.length === 0 && colleges.length > 0) {
        return NextResponse.json({ error: 'No valid colleges provided for extension.' }, { status: 400 });
    }

    const results = await prisma.$transaction(operations);

    // Optionally, update the main election status if it was ENDED and now an extension makes it effectively ONGOING
    // This part needs careful thought based on your status logic
    if (election.status === "ENDED" && newExtendedEndDate > new Date()) {
        await prisma.election.update({
            where: { id: electionId },
            data: { status: "ONGOING" } // Or a special status like "PARTIALLY_EXTENDED"
        });
    }


    return NextResponse.json({ message: `${results.length} college extensions processed.`, results }, { status: 200 });

  } catch (error) {
    console.error(`Error extending election ${electionId}:`, error);
    return NextResponse.json({ error: 'Failed to extend election for specified colleges.' }, { status: 500 });
  }
}