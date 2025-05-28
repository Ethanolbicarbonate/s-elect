// src/components/Voting/CandidateSelectionCard.js
"use client";

import Image from "next/image"; // Using Next/Image
import { useState, useEffect } from "react"; // Needed for state-based error handling

export default function CandidateSelectionCard({
  candidate,
  isSelected,
  onSelectToggle,
  isDisabled, // True if max selections for the position are reached & this isn't selected
  onViewDetails,
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (candidate && candidate.photoUrl) {
      setImageError(false); // Reset error if there's a new photoUrl
    } else {
      setImageError(false);
    }
  }, [candidate]);

  if (!candidate) return null;

  const {
    firstName,
    lastName,
    nickname,
    photoUrl,
    partylist,
    isIndependent,
  } = candidate;

  const displayName = `${firstName} ${lastName}${
    nickname ? ` (${nickname})` : ""
  }`;
  const affiliation = isIndependent ? "Independent" : partylist?.name || "N/A";

  // Determine card and button styling based on selection and disabled state
  let cardClasses = "card h-100 w-100 shadow-sm candidate-selection-card";
  let selectButtonClasses =
    "btn custom-btn fs-6 btn-sm mt-auto w-100 rounded-3 border"; // mt-auto pushes button to bottom
  let selectButtonText = "Select";
  let selectButtonIcon = "bi-check-circle";

  if (isSelected) {
    cardClasses += " border-primary border-2 selected"; // Custom class for selected state
    selectButtonClasses += " btn-primary";
    selectButtonText = "Selected";
    selectButtonIcon = "bi-check-circle-fill";
  } else if (isDisabled) {
    cardClasses += " disabled-candidate"; // Custom class for disabled state
    selectButtonClasses += " btn-outline-secondary disabled"; // Bootstrap disabled style
    selectButtonText = "Max Reached";
    selectButtonIcon = "bi-slash-circle";
  } else {
    cardClasses += " border-light";
    selectButtonClasses += " btn-outline-primary";
  }

  const handleCardClick = () => {
    if (!isDisabled || isSelected) {
      // Allow deselecting even if disabled (max reached)
      onSelectToggle();
    }
  };

  return (
    <div
      className={cardClasses}
      style={{
        cursor: !isDisabled || isSelected ? "pointer" : "not-allowed",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
      }}
      onClick={handleCardClick}
    >
      <div className="card-body p-3 d-flex flex-column text-center">
        {" "}
        <div
          className="mb-2 mx-auto rounded-circle shadow-sm" // Apply rounded-circle and shadow to the wrapper
          style={{
            width: "80px", // Explicit square dimensions for the wrapper
            height: "80px",
            border: "2px solid #dee2e6",
            overflow: "hidden", // Crucial: clips the image to the circular wrapper
            position: "relative", // Important for next/image with layout="fill"
            backgroundColor: "#f8f9fa", // Fallback background if image fails to load initially
          }}
        >
          {photoUrl && !imageError ? (
            <Image
              src={photoUrl}
              alt={displayName || "Candidate photo"}
              fill // Use the fill layout
              style={{
                objectFit: "cover", // Image covers the square wrapper
              }}
              sizes="(max-width: 768px) 100vw, 30vw" // Adjust sizes prop as needed for optimization
              onError={() => {
                console.warn(`Failed to load image: ${photoUrl}`);
                setImageError(true);
              }}
              priority
            />
          ) : (
            // This placeholder is now effectively covered by the wrapper's background
            // and the icon can be centered within the wrapper.
            <div
              className="d-flex align-items-center justify-content-center w-100 h-100" // Fill the wrapper
              title={displayName || "No photo available"}
            >
              <i className="bi bi-person-fill fs-1 text-secondary opacity-50"></i>
            </div>
          )}
        </div>
        <h6 className="card-title h6 mb-1 fw-medium text-dark-emphasis">
          {displayName}
        </h6>
        <p className={`card-text small mb-2 text-primary`}>{affiliation}</p>
        {/* Optional "View Details" button, or make the whole card clickable for details too */}
        <button
          type="button"
          className="btn btn-sm btn-link text-decoration-none p-0 mb-2 text-secondary opacity-75"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click from also toggling selection
            onViewDetails();
          }}
          aria-label={`View details for ${displayName}`}
        >
          View Details <i className="bi bi-search ms-1"></i>
        </button>
        {/* Selection Button - occupies remaining space if card body is flex-column */}
        <button
          type="button"
          className={selectButtonClasses}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click if button has its own action
            handleCardClick(); // Use the same consolidated logic
          }}
          disabled={isDisabled && !isSelected} // Disable only if maxed out and not already selected
        >
          <i className={`bi ${selectButtonIcon} me-2`}></i>
          {selectButtonText}
        </button>
      </div>
      <style jsx>{`
        .candidate-selection-card:hover {
          transform: ${!isDisabled || isSelected ? "translateY(-3px)" : "none"};
          box-shadow: ${!isDisabled || isSelected
            ? "0 .5rem 1rem rgba(0,0,0,.15)!important"
            : "0 .125rem .25rem rgba(0,0,0,.075)!important"};
        }
        .candidate-selection-card.selected {
          // background-color: #e7f1ff; // A very light blue for selected state
        }
        .candidate-selection-card.disabled-candidate {
          opacity: 0.75;
          // background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
}
