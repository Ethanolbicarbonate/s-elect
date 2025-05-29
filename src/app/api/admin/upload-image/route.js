// src/app/api/admin/upload-image/route.js
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary"; // Your Cloudinary config
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed
import { logAdminActivity, getIpAddressFromRequest } from "@/lib/auditLogger";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditLogStatus, AuditActorType} from "@prisma/client";

// --- POST - Upload Image (Existing Code) ---
export async function POST(request) {
  const session = await getServerSession(authOptions);
  const ipAddress = getIpAddressFromRequest(request); // Get IP for logging

  // Ensure only authenticated admins can upload
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      // Log forbidden attempt
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_UPLOADED,
      status: AuditLogStatus.FAILURE,
      details: { error: "Forbidden: Insufficient privileges for upload." },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      await logAdminActivity({
        // Log missing file
        session,
        actionType: AUDIT_ACTION_TYPES.IMAGE_UPLOADED,
        status: AuditLogStatus.FAILURE,
        details: { error: "No file provided for upload." },
        ipAddress,
      });
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      await logAdminActivity({
        // Log invalid file type
        session,
        actionType: AUDIT_ACTION_TYPES.IMAGE_UPLOADED,
        status: AuditLogStatus.FAILURE,
        details: { error: "Uploaded item is not a file (expected Blob)." },
        ipAddress,
      });
      return NextResponse.json(
        { error: "Uploaded item is not a file." },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      await logAdminActivity({
        // Log file too large
        session,
        actionType: AUDIT_ACTION_TYPES.IMAGE_UPLOADED,
        status: AuditLogStatus.FAILURE,
        details: {
          error: `File is too large (${file.size} bytes). Max: ${MAX_FILE_SIZE_BYTES}.`,
          originalFilename: file.name,
        },
        ipAddress,
      });
      return NextResponse.json(
        {
          error: `File is too large. Max size is ${
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
          }MB.`,
        },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "election_entities",
            // public_id: `unique_id_or_hash`, // Optional: if you want more control
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        )
        .end(buffer);
    });

    if (!uploadResult || !uploadResult.secure_url || !uploadResult.public_id) {
      throw new Error(
        "Cloudinary upload failed to return essential data (secure_url/public_id)."
      );
    }

    // Audit Log for successful upload
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_UPLOADED,
      status: AuditLogStatus.SUCCESS,
      entityType: "CloudinaryImage", // Or a specific entity type like "PartylistLogo", "CandidatePhoto"
      entityId: uploadResult.public_id,
      details: {
        url: uploadResult.secure_url,
        originalFilename: file.name,
        size: file.size,
        format: uploadResult.format,
      },
      ipAddress,
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully!",
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload API Error:", error);
    await logAdminActivity({
      // Log general upload failure
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_UPLOADED,
      status: AuditLogStatus.FAILURE,
      details: {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        filenameAttempt: file?.name,
      },
      ipAddress,
    });

    if (error.http_code && error.message) {
      return NextResponse.json(
        { error: `Cloudinary Error: ${error.message}` },
        { status: error.http_code }
      );
    }
    return NextResponse.json(
      { error: "Failed to upload file. " + error.message },
      { status: 500 }
    );
  }
}

// --- DELETE - Delete Image ---
export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  const ipAddress = getIpAddressFromRequest(request);

  // Ensure only authenticated admins can delete
  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_DELETED,
      status: AuditLogStatus.FAILURE,
      details: {
        error: "Forbidden: Insufficient privileges for image deletion.",
      },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges." },
      { status: 403 }
    );
  }

  // Cloudinary public_id is typically extracted from the URL,
  // or passed directly in the request body/params.
  // For simplicity, let's assume publicId comes in the request body.
  const { publicId } = await request.json();

  if (!publicId) {
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_DELETED,
      status: AuditLogStatus.FAILURE,
      details: { error: "Public ID is required for image deletion." },
      ipAddress,
    });
    return NextResponse.json(
      { error: "Public ID is required." },
      { status: 400 }
    );
  }

  try {
    // Destroy image from Cloudinary
    const destroyResult = await cloudinary.uploader.destroy(publicId);

    if (destroyResult.result !== "ok" && destroyResult.result !== "not found") {
      // 'not found' is not necessarily an error, but 'ok' is what we want for success.
      // If it's not 'ok' and not 'not found', something else went wrong.
      throw new Error(
        `Cloudinary deletion failed with result: ${destroyResult.result}`
      );
    }

    // Audit Log for successful deletion
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_DELETED,
      status: AuditLogStatus.SUCCESS,
      entityType: "CloudinaryImage",
      entityId: publicId,
      details: {
        message: "Image deleted from Cloudinary.",
        destroyResult: destroyResult.result,
      },
      ipAddress,
    });

    return NextResponse.json(
      {
        message: `Image with public ID '${publicId}' deleted successfully.`,
        result: destroyResult.result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Image API Error:", error);
    await logAdminActivity({
      session,
      actionType: AUDIT_ACTION_TYPES.IMAGE_DELETED,
      status: AuditLogStatus.FAILURE,
      entityType: "CloudinaryImage",
      entityId: publicId,
      details: {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      ipAddress,
    });

    if (error.http_code && error.message) {
      return NextResponse.json(
        { error: `Cloudinary Error: ${error.message}` },
        { status: error.http_code }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete image." + error.message },
      { status: 500 }
    );
  }
}
