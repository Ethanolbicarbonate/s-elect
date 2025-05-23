// src/app/api/admin/positions/[positionId]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import { PositionType, College } from "@prisma/client";

// GET - Fetch a specific position
export async function GET(request, context) {
  const params = await context.params;
  const { positionId } = params;
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });
    if (!position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(position, { status: 200 });
  } catch (error) {
    console.error(`Error fetching position ${positionId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch position." },
      { status: 500 }
    );
  }
}

// PUT - Update a specific position
export async function PUT(request, context) {
  const params = await context.params;
  const { electionId, positionId } = params; // electionId might also be useful context
  const session = await getServerSession(authOptions);

  // MODIFIED AUTHORIZATION CHECK
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const incomingData = await request.json(); // This is what the client sends for update

    // 1. Fetch the existing position
    const existingPosition = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!existingPosition) {
      return NextResponse.json(
        { error: "Position not found." },
        { status: 404 }
      );
    }

    // 2. Authorization Check for MODERATOR
    if (session.user.role === "MODERATOR") {
      // Check if moderator can operate on the EXISTING position's scope
      if (
        existingPosition.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          {
            error: "Forbidden: College moderators cannot modify USC positions.",
          },
          { status: 403 }
        );
      }
      if (existingPosition.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          return NextResponse.json(
            { error: "Forbidden: USC moderators cannot modify CSC positions." },
            { status: 403 }
          );
        }
        if (existingPosition.college !== session.user.college) {
          // College Mod, wrong college
          return NextResponse.json(
            {
              error: "Forbidden: Cannot modify positions for another college.",
            },
            { status: 403 }
          );
        }
      }

      // If moderator is attempting to change the scope (type or college) of the position
      // Ensure the NEW scope is also valid for them.
      const newProposedType =
        incomingData.type !== undefined
          ? incomingData.type
          : existingPosition.type;
      let newProposedCollege =
        incomingData.college !== undefined
          ? incomingData.college
          : existingPosition.college;

      if (
        incomingData.type !== undefined ||
        incomingData.college !== undefined
      ) {
        // Only check if type or college is part of the update
        if (newProposedType === PositionType.USC) {
          if (session.user.college !== null) {
            // College Mod trying to change/set to USC
            return NextResponse.json(
              {
                error:
                  "Forbidden: College moderators cannot change position to USC type.",
              },
              { status: 403 }
            );
          }
          newProposedCollege = null; // If type becomes USC, college must be null
        } else if (newProposedType === PositionType.CSC) {
          if (session.user.college === null) {
            // USC Mod trying to change/set to CSC
            return NextResponse.json(
              {
                error:
                  "Forbidden: USC moderators cannot change position to CSC type.",
              },
              { status: 403 }
            );
          }
          // If newProposedCollege is not provided in incomingData, and type is CSC, it must be mod's college.
          // If newProposedCollege IS provided, it must match mod's college.
          if (
            !newProposedCollege ||
            newProposedCollege !== session.user.college
          ) {
            return NextResponse.json(
              {
                error: `Forbidden: Cannot change position to CSC type for college '${
                  newProposedCollege || ""
                }'. Must be your assigned college (${session.user.college}).`,
              },
              { status: 403 }
            );
          }
        }
      }
      // If scope changes are proposed by moderator and valid, apply them to incomingData before constructing updateData
      if (incomingData.type !== undefined) incomingData.type = newProposedType; // Should already be this, but for clarity
      if (
        incomingData.college !== undefined ||
        newProposedType === PositionType.USC ||
        (newProposedType === PositionType.CSC &&
          newProposedCollege === session.user.college)
      ) {
        incomingData.college = newProposedCollege; // This applies the moderated college (null for USC, or their own CSC)
      }
    } else if (session.user.role === "SUPER_ADMIN") {
      // If SUPER_ADMIN changes type to USC, ensure college becomes null
      if (incomingData.type === PositionType.USC) {
        incomingData.college = null;
      } else if (
        incomingData.type === PositionType.CSC &&
        incomingData.college === undefined
      ) {
        // If type is CSC (either new or existing) and no college is provided in update by SA,
        // keep existing college if position was already CSC, otherwise it's an error if becoming CSC without college.
        if (existingPosition.type !== PositionType.CSC) {
          return NextResponse.json(
            { error: "College is required if changing position type to CSC." },
            { status: 400 }
          );
        }
        // If existingPosition.type was CSC, incomingData.college being undefined means SA doesn't want to change it.
        // No action needed, updateData will just not include 'college'.
      } else if (
        incomingData.type === PositionType.CSC &&
        incomingData.college &&
        !Object.values(College).includes(incomingData.college)
      ) {
        return NextResponse.json(
          { error: "Invalid college value for CSC position." },
          { status: 400 }
        );
      }
    }

    // 3. Construct updateData based on validated incomingData
    const updateData = {};
    if (incomingData.name !== undefined) updateData.name = incomingData.name;
    if (incomingData.description !== undefined)
      updateData.description = incomingData.description;

    // Handle type and college carefully based on previous validation for SA and Moderator
    if (incomingData.type !== undefined) {
      if (!Object.values(PositionType).includes(incomingData.type)) {
        return NextResponse.json(
          { error: "Invalid position type provided." },
          { status: 400 }
        );
      }
      updateData.type = incomingData.type;
      // College is now determined by the authorization logic above and set in incomingData
      // or directly if SA provides it.
      if (updateData.type === PositionType.USC) {
        updateData.college = null;
      } else if (updateData.type === PositionType.CSC) {
        if (
          incomingData.college === undefined &&
          session.user.role === "SUPER_ADMIN" &&
          existingPosition.type === PositionType.CSC
        ) {
          // SA is updating a CSC position but not changing college field, keep existing
          updateData.college = existingPosition.college;
        } else if (
          incomingData.college &&
          Object.values(College).includes(incomingData.college)
        ) {
          updateData.college = incomingData.college;
        } else {
          // This case should have been caught by moderator checks or SA explicit CSC college requirement
          return NextResponse.json(
            {
              error:
                "Valid college is required for CSC positions after scope validation.",
            },
            { status: 400 }
          );
        }
      }
    } else if (incomingData.hasOwnProperty("college")) {
      // Only college is being changed, type remains same
      if (existingPosition.type === PositionType.USC) {
        updateData.college = null; // Cannot set college for USC type
      } else if (existingPosition.type === PositionType.CSC) {
        if (
          !incomingData.college ||
          !Object.values(College).includes(incomingData.college)
        ) {
          return NextResponse.json(
            { error: "Valid college is required for CSC positions." },
            { status: 400 }
          );
        }
        updateData.college = incomingData.college;
      }
    }

    if (incomingData.maxVotesAllowed !== undefined) {
      const maxVotes = parseInt(incomingData.maxVotesAllowed);
      if (isNaN(maxVotes) || maxVotes < 1) {
        return NextResponse.json(
          { error: "Max votes allowed must be a number and at least 1." },
          { status: 400 }
        );
      }
      updateData.maxVotesAllowed = maxVotes;
      // Re-check minVotes if maxVotes is changing
      const currentMinVotes =
        incomingData.minVotesRequired !== undefined
          ? parseInt(incomingData.minVotesRequired)
          : existingPosition.minVotesRequired !== null
          ? existingPosition.minVotesRequired
          : 0;
      if (currentMinVotes > maxVotes) {
        return NextResponse.json(
          { error: "Min votes required cannot exceed max votes allowed." },
          { status: 400 }
        );
      }
      if (incomingData.minVotesRequired !== undefined)
        updateData.minVotesRequired = currentMinVotes; // Add if it was part of incoming
    }

    if (
      incomingData.minVotesRequired !== undefined &&
      updateData.maxVotesAllowed === undefined
    ) {
      // if only minVotes is changing
      const minVotes = parseInt(incomingData.minVotesRequired);
      const currentMaxVotes = existingPosition.maxVotesAllowed; // Max votes isn't changing
      if (isNaN(minVotes) || minVotes < 0) {
        return NextResponse.json(
          { error: "Min votes required must be a non-negative number." },
          { status: 400 }
        );
      }
      if (minVotes > currentMaxVotes) {
        return NextResponse.json(
          { error: "Min votes required cannot exceed max votes allowed." },
          { status: 400 }
        );
      }
      updateData.minVotesRequired = minVotes;
    }

    if (incomingData.order !== undefined) {
      const order = parseInt(incomingData.order);
      if (isNaN(order)) {
        return NextResponse.json(
          { error: "Order must be a number." },
          { status: 400 }
        );
      }
      updateData.order = order;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No changes provided to update." },
        { status: 200 }
      ); // Or 304 Not Modified
    }

    // 4. Perform the update
    const updatedPosition = await prisma.position.update({
      where: { id: positionId },
      data: updateData,
    });
    return NextResponse.json(updatedPosition, { status: 200 });
  } catch (error) {
    console.error(`Error updating position ${positionId}:`, error);
    if (error.code === "P2002") {
      // Unique constraint (e.g., electionId, name, college)
      return NextResponse.json(
        {
          error:
            "A position with this name (and college, if CSC) already exists for this election.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update position. " + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific position
export async function DELETE(request, context) {
  const params = await context.params;
  const { electionId, positionId } = params;
  const session = await getServerSession(authOptions);

  // MODIFIED AUTHORIZATION CHECK
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const positionToDelete = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!positionToDelete) {
      return NextResponse.json(
        { error: "Position not found." },
        { status: 404 }
      );
    }

    // SCOPE VALIDATION FOR MODERATOR
    if (session.user.role === "MODERATOR") {
      if (
        positionToDelete.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          {
            error: "Forbidden: College moderators cannot delete USC positions.",
          },
          { status: 403 }
        );
      }
      if (positionToDelete.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          return NextResponse.json(
            { error: "Forbidden: USC moderators cannot delete CSC positions." },
            { status: 403 }
          );
        }
        if (positionToDelete.college !== session.user.college) {
          // College Mod, wrong college
          return NextResponse.json(
            {
              error: "Forbidden: Cannot delete positions from another college.",
            },
            { status: 403 }
          );
        }
      }
    }

    const candidatesCount = await prisma.candidate.count({
      where: { positionId: positionId },
    });

    if (candidatesCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete position. It has associated candidates. Please remove them first.",
        },
        { status: 409 } // Conflict
      );
    }

    await prisma.position.delete({
      where: { id: positionId },
    });
    // On successful deletion with no content to return
    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(`Error deleting position ${positionId}:`, error);
    // Prisma's P2025 "Record to delete not found" might also be caught here if findUnique fails before delete
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Position not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete position." },
      { status: 500 }
    );
  }
}
