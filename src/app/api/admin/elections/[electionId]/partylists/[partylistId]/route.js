// src/app/api/admin/partylists/[partylistId]/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PositionType, College } from "@prisma/client";

    

// GET - Fetch a specific partylist
export async function GET(request, context) {
  const session = await getServerSession(authOptions);
  const { partylistId } = await context.params;

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const partylist = await prisma.partylist.findUnique({
      where: { id: partylistId },
    });

    if (!partylist) {
      return NextResponse.json(
        { error: "Partylist not found" },
        { status: 404 }
      );
    }

    // Optional: Further authorization for MODERATOR/AUDITOR to view only their scope
    if (session.user.role === "MODERATOR" || session.user.role === "AUDITOR") {
      if (
        partylist.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          { error: "Forbidden: College users cannot view this USC partylist." },
          { status: 403 }
        );
      }
      if (partylist.type === PositionType.CSC) {
        if (
          session.user.college === null &&
          partylist.type === PositionType.CSC
        ) {
          // USC user trying to view CSC
          return NextResponse.json(
            {
              error:
                "Forbidden: USC users cannot view this CSC partylist directly without college scope.",
            },
            { status: 403 }
          );
        }
        if (
          partylist.college !== session.user.college &&
          session.user.college !== null
        ) {
          // College user, wrong college
          return NextResponse.json(
            {
              error:
                "Forbidden: Access to this partylist is restricted to its college.",
            },
            { status: 403 }
          );
        }
      }
    }
    return NextResponse.json(partylist, { status: 200 });
  } catch (error) {
    console.error(`Error fetching partylist ${partylistId}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch partylist." },
      { status: 500 }
    );
  }
}

async function authorizePartylistAccess(electionId, session) {
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return {
      authorized: false,
      error: "Forbidden: Insufficient privileges.",
      status: 403,
    };
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });
  if (!election) {
    return { authorized: false, error: "Election not found.", status: 404 };
  }

  if (session.user.role === "MODERATOR") {
    if (!election.scopeType) {
      return {
        authorized: false,
        error: "Forbidden: Election scope not defined.",
        status: 403,
      };
    }
    if (election.scopeType === "USC" && session.user.college !== null) {
      return {
        authorized: false,
        error:
          "Forbidden: College moderators cannot manage partylists for USC elections.",
        status: 403,
      };
    }
    if (election.scopeType === "CSC") {
      if (session.user.college === null) {
        return {
          authorized: false,
          error:
            "Forbidden: USC moderators cannot manage partylists for CSC elections.",
          status: 403,
        };
      }
      if (election.college !== session.user.college) {
        return {
          authorized: false,
          error: `Forbidden: Cannot manage partylists for an election scoped to college '${election.college}'.`,
          status: 403,
        };
      }
    }
  }
  return { authorized: true };
}

// PUT - Update a specific partylist
export async function PUT(request, context) {
  const session = await getServerSession(authOptions);
  const { electionId, partylistId } = await context.params; // electionId for context, partylistId for targeting

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    const existingPartylist = await prisma.partylist.findUnique({
      where: { id: partylistId },
    });

    if (!existingPartylist || existingPartylist.electionId !== electionId) {
      return NextResponse.json(
        { error: "Partylist not found or does not belong to this election." },
        { status: 404 }
      );
    }

    const dataToUpdate = await request.json();
    // Destructure potential updates, including type and college
    const { name, acronym, logoUrl, platform, type, college } = dataToUpdate;

    // --- SCOPE VALIDATION FOR MODERATOR (on existingPartylist) ---
    if (session.user.role === "MODERATOR") {
      if (
        existingPartylist.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot modify USC partylists.",
          },
          { status: 403 }
        );
      }
      if (existingPartylist.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot modify CSC partylists.",
            },
            { status: 403 }
          );
        }
        if (existingPartylist.college !== session.user.college) {
          // College Mod, wrong college
          return NextResponse.json(
            {
              error: "Forbidden: Cannot modify partylists for another college.",
            },
            { status: 403 }
          );
        }
      }

      // If moderator is attempting to change the scope (type or college)
      // This is generally complex. Simpler to disallow scope changes by moderators.
      // Or, if allowed, the NEW scope must also be valid for them.
      if (type !== undefined && type !== existingPartylist.type) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Moderators cannot change the scope (type/college) of a partylist. Recreate if needed.",
          },
          { status: 403 }
        );
      }
      if (
        college !== undefined &&
        college !== existingPartylist.college &&
        existingPartylist.type === PositionType.CSC
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Moderators cannot change the college scope of a CSC partylist.",
          },
          { status: 403 }
        );
      }
      // For simplicity, moderators cannot change the `type` or `college` of an existing partylist.
      // They can only update other details (name, acronym, etc.) for partylists within their scope.
      // If type/college are in dataToUpdate from a moderator, ignore them or error.
      if (
        (dataToUpdate.type && dataToUpdate.type !== existingPartylist.type) ||
        (dataToUpdate.college &&
          dataToUpdate.college !== existingPartylist.college &&
          existingPartylist.type === PositionType.CSC)
      ) {
        // It's cleaner if frontend doesn't even send type/college fields for moderator updates
        console.warn(
          "Moderator attempting to change partylist scope, ignoring."
        );
        delete dataToUpdate.type;
        delete dataToUpdate.college;
      }
    }

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (acronym !== undefined) updatePayload.acronym = acronym;
    if (logoUrl !== undefined) updatePayload.logoUrl = logoUrl;
    if (platform !== undefined) updatePayload.platform = platform;

    // SUPER_ADMIN can change type and college
    if (session.user.role === "SUPER_ADMIN") {
      if (type !== undefined) {
        if (!Object.values(PositionType).includes(type)) {
          return NextResponse.json(
            { error: "Invalid partylist type." },
            { status: 400 }
          );
        }
        updatePayload.type = type;
        if (type === PositionType.USC) {
          updatePayload.college = null; // USC partylists must have null college
        } else if (type === PositionType.CSC) {
          if (!college || !Object.values(College).includes(college)) {
            return NextResponse.json(
              { error: "Valid college is required for CSC partylists." },
              { status: 400 }
            );
          }
          updatePayload.college = college;
        }
      } else if (
        college !== undefined &&
        existingPartylist.type === PositionType.CSC
      ) {
        // Type not changing, but college might be
        if (!Object.values(College).includes(college)) {
          return NextResponse.json(
            { error: "Invalid college for CSC partylist." },
            { status: 400 }
          );
        }
        updatePayload.college = college;
      } else if (
        college !== undefined &&
        existingPartylist.type === PositionType.USC
      ) {
        updatePayload.college = null; // Cannot set college for USC partylist
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No data provided for update." },
        { status: 400 }
      );
    }

    const updatedPartylist = await prisma.partylist.update({
      where: { id: partylistId },
      data: updatePayload,
    });
    return NextResponse.json(updatedPartylist, { status: 200 });
  } catch (error) {
    console.error(`Error updating partylist ${partylistId}:`, error);
    if (error.code === "P2002" && error.meta?.target) {
      const targetFields = error.meta.target.join(", ");
      return NextResponse.json(
        {
          error: `A partylist with these details (${targetFields}) already exists for this election.`,
        },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      // Record to update not found
      return NextResponse.json(
        { error: "Partylist not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update partylist." },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific partylist
export async function DELETE(request, context) {
  const session = await getServerSession(authOptions);
  const { electionId, partylistId } = await context.params;

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    const partylistToDelete = await prisma.partylist.findUnique({
      where: { id: partylistId },
    });

    if (!partylistToDelete || partylistToDelete.electionId !== electionId) {
      return NextResponse.json(
        { error: "Partylist not found or does not belong to this election." },
        { status: 404 }
      );
    }

    // --- SCOPE VALIDATION FOR MODERATOR ---
    if (session.user.role === "MODERATOR") {
      if (
        partylistToDelete.type === PositionType.USC &&
        session.user.college !== null
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: College moderators cannot delete USC partylists.",
          },
          { status: 403 }
        );
      }
      if (partylistToDelete.type === PositionType.CSC) {
        if (session.user.college === null) {
          // USC Mod
          return NextResponse.json(
            {
              error: "Forbidden: USC moderators cannot delete CSC partylists.",
            },
            { status: 403 }
          );
        }
        if (partylistToDelete.college !== session.user.college) {
          // College Mod, wrong college
          return NextResponse.json(
            {
              error:
                "Forbidden: Cannot delete partylists from another college.",
            },
            { status: 403 }
          );
        }
      }
    }

    // onDelete: SetNull on Candidate.partylistId handles candidate disassociation
    await prisma.partylist.delete({
      where: { id: partylistId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting partylist ${partylistId}:`, error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Partylist not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete partylist." },
      { status: 500 }
    );
  }
}
