// src/app/api/admin/upload-image/route.js
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary"; // Your Cloudinary config
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed

// Helper to convert stream to buffer (if needed, depending on parsing method)
// async function streamToBuffer(readableStream) {
//   const chunks = [];
//   for await (const chunk of readableStream) {
//     chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
//   }
//   return Buffer.concat(chunks);
// }

export async function POST(request) {
  const session = await getServerSession(authOptions);
  // Ensure only authenticated admins can upload
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
    const formData = await request.formData(); // Next.js built-in way to get FormData
    const file = formData.get("file"); // 'file' should be the name used in client-side FormData append

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Uploaded item is not a file." },
        { status: 400 }
      );
    }

    // Check file size (Cloudinary free tier might have its own limits too, but good to check here)
    // Your desired max size is 5MB = 5 * 1024 * 1024 bytes
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Max size is ${
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
          }MB.`,
        },
        { status: 413 }
      ); // 413 Payload Too Large
    }

    // Convert Blob to a Buffer to stream to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // --- Upload to Cloudinary ---
    // It's good practice to upload via a stream if possible for large files,
    // but for <5MB, buffer upload is often fine and simpler.
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "election_entities", // Optional: organize uploads in a Cloudinary folder
          // resource_type: "image", // auto-detects usually fine
          // public_id: `some_unique_name`, // Optional: if you want to set a specific public_id
          // transformations, tags, etc. can be added here
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    if (!uploadResult || !uploadResult.secure_url) {
      throw new Error("Cloudinary upload failed to return a secure URL.");
    }

    // Audit Log for successful upload (optional but good)
    // await logAdminActivity({ session, actionType: "IMAGE_UPLOADED", entityType: "Image", entityId: uploadResult.public_id, details: { url: uploadResult.secure_url, originalFilename: file.name, size: file.size }, ipAddress: getIpAddressFromRequest(request) });

    return NextResponse.json(
      {
        message: "File uploaded successfully!",
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id, // Useful if you ever want to delete/manage by public_id
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload API Error:", error);
    // Audit Log for failed upload
    // await logAdminActivity({ session, actionType: "IMAGE_UPLOAD_FAILED", status: "FAILURE", details: { error: error.message }, ipAddress: getIpAddressFromRequest(request) });

    // Check if error is from Cloudinary and has more specific details
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
