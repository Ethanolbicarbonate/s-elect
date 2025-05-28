// src/components/StudentView/CandidateCard.js
"use client";

import Image from "next/image"; // Using Next.js Image for optimization

export default function CandidateCard({ candidate, onViewDetails }) {
  if (!candidate) return null;

  const {
    firstName,
    lastName,
    nickname,
    photoUrl,
    position, // Expected to be an object: { name: 'Position Name' }
    partylist, // Expected to be an object: { name: 'Partylist Name' } or null
    isIndependent,
    bio,
  } = candidate;

  const displayName = `${firstName} ${lastName}${
    nickname ? ` "${nickname}"` : ""
  }`;
  const runningFor = position?.name || "N/A";
  const affiliation = isIndependent ? "Independent" : partylist?.name || "N/A";

  // Truncate bio
  const truncateText = (text, maxLength) => {
    if (!text) return "No bio provided.";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };
  const truncatedBio = truncateText(bio, 80); // Show about 80 characters

  return (
    <div className="card h-100 shadow-sm candidate-card w-100 rounded-3">
      {" "}
      {/* h-100 for equal height in flex rows */}
      <div
        className="card-img-top-wrapper bg-light text-center rounded-3"
        style={{height: "180px", overflow: "hidden" }}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={displayName}
            width={180} // Intrinsic or target width
            height={180} // Intrinsic or target height
            className="img-fluid " // Bootstrap class for responsive images
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              // This basic onError might not be ideal for Next/Image.
              // Consider a placeholder prop or more robust error handling if needed.
              e.currentTarget.style.display = "none"; // Hide broken image
              // Optionally, show a sibling placeholder div/icon here
            }}
          />
        ) : (
          <div className="d-flex align-items-center justify-content-center h-100">
            <i className="bi bi-person-bounding-box display-1 text-secondary opacity-50"></i>
          </div>
        )}
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title h6 mb-0 text-primary">{displayName}</h5>
        <hr className="border-1 border-secondary opacity-20 my-2" />

        <p className="card-text text-primary opacity-75 fs-7 small mb-1">
          <i className="bi bi-person-fill fs-7 text-primary me-2"></i>{" "}
          {runningFor}
        </p>
        <p className="card-text text-primary opacity-75 fs-7 small mb-1">
          <i className="bi bi bi-people-fill fs-7 text-primary me-2"></i>{" "}
          {affiliation}
        </p>
        <div className="text-center">
          <i className="bi bi-dot fs-7 text-muted"></i>
        </div>
        <p className="card-text small text-secondary mb-3 flex-grow-1">
          {truncatedBio}
        </p>
        <button
          onClick={() => onViewDetails(candidate)}
          className="btn custom-btn fs-7 btn-sm text-secondary bg-secondary-subtle" // mt-auto pushes button to bottom if card body is flex-column
        >
          View Details
        </button>
      </div>
      <style jsx>{`
        .candidate-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          border: 1px solid #e0e0e0;
        }
        .candidate-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1) !important;
        }
        .card-img-top-wrapper img {
          border-top-left-radius: calc(
            0.375rem - 1px
          ); // Match Bootstrap card radius
          border-top-right-radius: calc(0.375rem - 1px);
        }
      `}</style>
    </div>
  );
}
