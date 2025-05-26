// src/components/Voting/CandidateSelectionCard.js
"use client";

import Image from "next/image"; // Using Next/Image

export default function CandidateSelectionCard({
  candidate,
  isSelected,
  onSelectToggle,
  isDisabled, // True if max selections for the position are reached & this isn't selected
  onViewDetails,
}) {
  if (!candidate) return null;

  const {
    firstName,
    lastName,
    nickname,
    photoUrl,
    // position, // Position name is usually displayed as the section header in VotingSection
    partylist,
    isIndependent,
  } = candidate;

  const displayName = `${firstName} ${lastName}${nickname ? ` (${nickname})` : ""}`;
  const affiliation = isIndependent ? "Independent" : partylist?.name || "N/A";

  // Determine card and button styling based on selection and disabled state
  let cardClasses = "card h-100 shadow-sm candidate-selection-card";
  let selectButtonClasses = "btn mt-auto w-100 fw-medium"; // mt-auto pushes button to bottom
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
    if (!isDisabled || isSelected) { // Allow deselecting even if disabled (max reached)
        onSelectToggle();
    }
  };


  return (
    <div className={cardClasses} style={{ cursor: (!isDisabled || isSelected) ? 'pointer' : 'not-allowed', transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out' }} onClick={handleCardClick}>
      <div className="card-body p-3 d-flex flex-column text-center"> {/* Flex column for button at bottom */}
        <div className="mb-2 mx-auto"> {/* Centering the image */}
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={displayName}
              width={80} // Smaller image for selection card
              height={80}
              className="img-fluid rounded-circle shadow-sm"
              style={{ objectFit: "cover", border: "2px solid #dee2e6" }}
              onError={(e) => {
                // Basic fallback, could be more sophisticated
                const placeholderDiv = document.createElement('div');
                placeholderDiv.className = "d-flex align-items-center justify-content-center bg-light rounded-circle";
                placeholderDiv.style.width = "80px";
                placeholderDiv.style.height = "80px";
                placeholderDiv.style.border = "2px solid #dee2e6";
                placeholderDiv.innerHTML = '<i class="bi bi-person-fill fs-1 text-secondary opacity-50"></i>';
                e.currentTarget.parentNode.replaceChild(placeholderDiv, e.currentTarget);
              }}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center bg-light rounded-circle mx-auto"
              style={{
                width: "80px",
                height: "80px",
                border: "2px solid #dee2e6"
              }}
            >
              <i className="bi bi-person-fill fs-1 text-secondary opacity-50"></i>
            </div>
          )}
        </div>

        <h6 className="card-title h6 mb-1 fw-semibold text-dark-emphasis">{displayName}</h6>
        <p className={`card-text small mb-2 ${isIndependent ? 'text-success' : 'text-info'}`}>
          {affiliation}
        </p>

        {/* Optional "View Details" button, or make the whole card clickable for details too */}
        <button
          type="button"
          className="btn btn-sm btn-link text-decoration-none p-0 mb-2"
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
          transform: ${!isDisabled || isSelected ? 'translateY(-3px)' : 'none'};
          box-shadow: ${!isDisabled || isSelected ? '0 .5rem 1rem rgba(0,0,0,.15)!important' : '0 .125rem .25rem rgba(0,0,0,.075)!important'};
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