// src/app/api/admin/candidates/[candidateId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType } from '@prisma/client';


// GET - Fetch a specific candidate
export async function GET(request, context) {
  const params = await context.params;
  const { candidateId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !['SUPER_ADMIN', 'MODERATOR', 'AUDITOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { position: true, partylist: true /*, student: true */ },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Authorization for Moderators
    if (session.user.role === 'MODERATOR') {
        if (candidate.position.type === PositionType.USC && session.user.college !== null) {
            return NextResponse.json({ error: 'Forbidden: College moderators cannot view this USC candidate detail.' }, { status: 403 });
        }
        if (candidate.position.type === PositionType.CSC) {
            if (session.user.college === null) { // USC mod
                return NextResponse.json({ error: 'Forbidden: USC moderators cannot view this CSC candidate detail.' }, { status: 403 });
            }
            if (candidate.position.college !== session.user.college) { // College mod, wrong college
                return NextResponse.json({ error: 'Forbidden: Access to this candidate is restricted.' }, { status: 403 });
            }
        }
    }

    return NextResponse.json(candidate, { status: 200 });
  } catch (error) {
    console.error(`Error fetching candidate ${candidateId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch candidate.' }, { status: 500 });
  }
}


// PUT - Update a specific candidate
export async function PUT(request, context) {
  const params = await context.params;
  const { candidateId } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !['SUPER_ADMIN', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await request.json();
    // Destructure all possible fields from Candidate model
    const {
        firstName, lastName, middleName, nickname, photoUrl, bio, platformPoints,
        isIndependent, electionId, positionId, partylistId
      } = data;

    const candidateToUpdate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: { position: true } // Need position for auth checks
    });

    if (!candidateToUpdate) {
        return NextResponse.json({ error: 'Candidate not found to update.' }, { status: 404 });
    }

    // Authorization for Moderators
    if (session.user.role === 'MODERATOR') {
        if (candidateToUpdate.position.type === PositionType.USC && session.user.college !== null) {
            return NextResponse.json({ error: 'Forbidden: College moderators cannot update USC candidates.' }, { status: 403 });
        }
        if (candidateToUpdate.position.type === PositionType.CSC) {
            if (session.user.college === null) { // USC mod
                return NextResponse.json({ error: 'Forbidden: USC moderators cannot update CSC candidates.' }, { status: 403 });
            }
            if (candidateToUpdate.position.college !== session.user.college) { // College mod, wrong college
                return NextResponse.json({ error: 'Forbidden: Cannot update candidates for another college.' }, { status: 403 });
            }
        }
        // Also check if the new positionId (if changed) is valid for this moderator
        if (positionId && positionId !== candidateToUpdate.positionId) {
            const newPosition = await prisma.position.findUnique({ where: { id: positionId } });
            if (!newPosition) return NextResponse.json({ error: 'New position not found.' }, { status: 404 });
            if (newPosition.type === PositionType.USC && session.user.college !== null) {
                return NextResponse.json({ error: 'Forbidden: College moderators cannot move candidate to USC position.' }, { status: 403 });
            }
            if (newPosition.type === PositionType.CSC && (session.user.college === null || newPosition.college !== session.user.college)) {
                return NextResponse.json({ error: 'Forbidden: Cannot move candidate to this CSC position.' }, { status: 403 });
            }
        }
    }

    // Business logic for 1 candidate per party per position (if maxVotesAllowed === 1 for the position)
    const targetPositionId = positionId || candidateToUpdate.positionId;
    const targetPartylistId = isIndependent ? null : (partylistId !== undefined ? partylistId : candidateToUpdate.partylistId);
    const targetIsIndependent = isIndependent !== undefined ? isIndependent : candidateToUpdate.isIndependent;

    const targetPosition = await prisma.position.findUnique({ where: { id: targetPositionId } });
    if (!targetPosition) return NextResponse.json({ error: 'Target position not found.' }, { status: 404 });

    if (!targetIsIndependent && targetPartylistId && targetPosition.maxVotesAllowed === 1) {
        const existingCandidate = await prisma.candidate.findFirst({
            where: {
                electionId: candidateToUpdate.electionId, // Assuming election doesn't change, or pass it in data
                positionId: targetPositionId,
                partylistId: targetPartylistId,
                id: { not: candidateId } // Exclude the current candidate being updated
            }
        });
        if (existingCandidate) {
            return NextResponse.json({ error: `This partylist already has another candidate for the position of ${targetPosition.name}.` }, { status: 409 });
        }
    }


    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (platformPoints !== undefined) updateData.platformPoints = Array.isArray(platformPoints) ? platformPoints : (platformPoints ? [platformPoints] : []);
    if (isIndependent !== undefined) updateData.isIndependent = isIndependent;
    // Admin might change position or party
    if (electionId !== undefined) updateData.electionId = electionId; // Usually shouldn't change election easily
    if (positionId !== undefined) updateData.positionId = positionId;
    if (isIndependent) {
        updateData.partylistId = null;
    } else if (partylistId !== undefined) { // if not independent, and partylistId is provided
        updateData.partylistId = partylistId;
    } // If partylistId is undefined and not independent, it means keep existing.


    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
    });
    return NextResponse.json(updatedCandidate, { status: 200 });
  } catch (error) {
    console.error(`Error updating candidate ${candidateId}:`, error);
    return NextResponse.json({ error: 'Failed to update candidate.' }, { status: 500 });
  }
}


// DELETE - Delete a specific candidate
export async function DELETE(request, context) {
  const params = await context.params;
  const { candidateId } = params;
  const session = await getServerSession(authOptions);

   if (!session || !session.user || !['SUPER_ADMIN', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const candidateToDelete = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: { position: true }
    });

    if (!candidateToDelete) {
        return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    // Authorization for Moderators
    if (session.user.role === 'MODERATOR') {
        if (candidateToDelete.position.type === PositionType.USC && session.user.college !== null) {
            return NextResponse.json({ error: 'Forbidden: College moderators cannot delete USC candidates.' }, { status: 403 });
        }
        if (candidateToDelete.position.type === PositionType.CSC) {
            if (session.user.college === null) { // USC mod
                return NextResponse.json({ error: 'Forbidden: USC moderators cannot delete CSC candidates.' }, { status: 403 });
            }
            if (candidateToDelete.position.college !== session.user.college) { // College mod, wrong college
                return NextResponse.json({ error: 'Forbidden: Cannot delete candidates from another college.' }, { status: 403 });
            }
        }
    }

    // TODO: Check if votes have been cast for this candidate before deleting.
    // If votes exist, you might want to "archive" or "disqualify" rather than hard delete.
    // For now, we'll do a hard delete.

    await prisma.candidate.delete({
      where: { id: candidateId },
    });
    return NextResponse.json({ message: 'Candidate deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting candidate ${candidateId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete candidate.' }, { status: 500 });
  }
}