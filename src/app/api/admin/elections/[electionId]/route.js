// src/app/api/admin/elections/[electionId]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from '@/lib/prisma'; // Using the singleton instance

// GET a specific election (already good to have)
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  const { electionId } = params;

  if (!session || !['SUPER_ADMIN', 'MODERATOR', 'AUDITOR'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }
    return NextResponse.json(election, { status: 200 });
  } catch (error) {
    console.error(`Error fetching election ${electionId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch election' }, { status: 500 });
  }
}


// PUT - Update an election (can be used for extending endDate, changing status, etc.)
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  const { electionId } = params;

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, description, startDate, endDate, status } = data; // These are general updates

    const currentElection = await prisma.election.findUnique({ where: { id: electionId }});
    if (!currentElection) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) {
        const newStartDate = new Date(startDate);
        if (endDate && newStartDate >= new Date(endDate || currentElection.endDate)) {
             return NextResponse.json({ error: 'Start date must be before end date.' }, { status: 400 });
        }
        if (!endDate && newStartDate >= new Date(currentElection.endDate)) {
            return NextResponse.json({ error: 'Start date must be before current end date if end date is not being updated.' }, { status: 400 });
        }
        updateData.startDate = newStartDate;
    }
    if (endDate !== undefined) {
        const newEndDate = new Date(endDate);
        if (newEndDate <= new Date(startDate || currentElection.startDate)) {
            return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
        }
        updateData.endDate = newEndDate;
    }
    if (status !== undefined) updateData.status = status;


    const updatedElection = await prisma.election.update({
      where: { id: electionId },
      data: updateData,
    });
    return NextResponse.json(updatedElection, { status: 200 });
  } catch (error) {
    // ... error handling ...
  }
}

// DELETE - "Cancel" an election (soft delete by archiving or setting status to ENDED)
// A true DELETE might be too destructive.
// For now, let's use PUT to change status to ARCHIVED or ENDED for "cancelling".
// If you want a dedicated DELETE:
/*
export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);
    const { electionId } = params;

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Option 1: True delete (careful!)
        // await prisma.election.delete({ where: { id: electionId } });
        // return NextResponse.json({ message: 'Election deleted successfully' }, { status: 200 });

        // Option 2: Soft delete by archiving (Recommended)
        const election = await prisma.election.findUnique({ where: { id: electionId } });
        if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

        // Don't allow "cancelling" an already ended/archived election in a way that changes its finality
        if (election.status === 'ENDED' || election.status === 'ARCHIVED') {
             return NextResponse.json({ error: `Election is already ${election.status}.` }, { status: 400 });
        }

        const cancelledElection = await prisma.election.update({
            where: { id: electionId },
            data: { status: 'ARCHIVED' }, // Or 'ENDED' if that's your "cancelled" state
        });
        return NextResponse.json(cancelledElection, { status: 200 });

    } catch (error) {
        console.error(`Error cancelling election ${electionId}:`, error);
        return NextResponse.json({ error: 'Failed to cancel election' }, { status: 500 });
    }
}
*/