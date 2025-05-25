// src/components/StudentView/CandidateDetailModal.js
"use client";

import Image from "next/image"; // Using Next/Image for optimization
import { useEffect } from "react";

export default function CandidateDetailModal({ show, onClose, candidate }) {
  useEffect(() => {
    if (show) {
      document.body.classList.add("modal-open-custom");
    } else {
      document.body.classList.remove("modal-open-custom");
    }
    return () => document.body.classList.remove("modal-open-custom");
  }, [show]);

  if (!show || !candidate) return null;

  const {
    firstName,
    lastName,
    nickname,
    photoUrl,
    position,
    partylist,
    isIndependent,
    bio,
    platformPoints,
  } = candidate;

  const displayName = `${firstName} ${lastName}${
    nickname ? ` "${nickname}"` : ""
  }`;
  const runningFor = position?.name || "N/A";
  const affiliation = isIndependent ? "Independent" : partylist?.name || "N/A";

  return (
    <>
      {/* Backdrop: Increased z-index to be reliably above other content but below modal */}
      <div className="modal-backdrop-blur fade show" style={{ zIndex: 1050 }} onClick={onClose}></div>
      
      <div
        className="modal fade show d-block" // d-block makes it visible
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidateDetailModalTitle"
        onClick={onClose} // Close on backdrop click
        style={{ zIndex: 1055 }} // Ensure modal is above backdrop
      >
        <div
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" // modal-lg for wider, modal-dialog-scrollable for long content
          role="document"
          onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking on modal-content
        >
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"> {/* Added overflow-hidden for better rounded corners with image */}
            
            <div className="modal-header bg-light py-3 px-4 border-bottom-0"> {/* Softer header, no bottom border for seamless look */}
              <h4 className="modal-title text-primary fw-medium" id="candidateDetailModalTitle">
                {displayName}
              </h4>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body p-4"> {/* Increased padding a bit */}
              <div className="row g-4"> {/* g-4 for slightly more gutter */}
                <div className="col-md-4 text-center d-flex flex-column align-items-center">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={displayName}
                      width={220} // Slightly larger
                      height={220}
                      className="img-fluid rounded-circle shadow mb-3" // Kept shadow
                      style={{ 
                        objectFit: "cover", 
                        border: "4px solid white", // White border for a "sticker" effect
                        boxShadow: "0 0 15px rgba(0,0,0,0.15)" // Softer shadow
                      }}
                      // Consider adding placeholder="blur" and blurDataURL if you have low-res versions
                      onError={(e) => { e.currentTarget.style.display = 'none'; /* Hide broken image */ }}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center mb-3 bg-light" // Added bg-light
                      style={{
                        width: "220px",
                        height: "220px",
                        borderRadius: "50%",
                        border: "4px solid white",
                        boxShadow: "0 0 15px rgba(0,0,0,0.1)"
                      }}
                    >
                      <i className="bi bi-person-fill display-1 text-secondary opacity-25"></i>
                    </div>
                  )}
                  <div className="mt-2"> {/* Grouped info below image */}
                    <p className="text-muted mb-1 fs-7 text-uppercase">Running for</p>
                    <h5 className="mb-2 h6 fw-medium text-primary">{runningFor}</h5>
                    
                    <p className="text-muted mb-1 fs-7 text-uppercase">Affiliation</p>
                    <h5 className={`fw-medium h6 text-primary`}>
                        {affiliation}
                    </h5>
                  </div>
                </div>

                <div className="col-md-8">
                  {bio && (
                    <div className="mb-4">
                      <h5 className="text-primary border-start border-primary border-3 ps-2 mb-3">
                        Profile
                      </h5>
                      <p
                        className="text-secondary lh-lg px-3" // Increased line-height
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {bio}
                      </p>
                    </div>
                  )}

                  {platformPoints && platformPoints.length > 0 && (
                    <div className="mb-3"> {/* Added mb-3 for spacing if bio is also present */}
                      <h5 className="text-primary border-start border-primary border-3 ps-2 mb-3">
                        Platform
                      </h5>
                      <ul className="list-group list-group-flush px-3"> {/* Changed to list-group for better styling */}
                        {platformPoints.map((point, index) => (
                          <li key={index} className="list-group-item d-flex align-items-start border-0 px-0 py-2"> {/* No borders, custom padding */}
                            <i className="bi bi-check-circle-fill text-success me-3 mt-1 fs-7"></i> {/* Larger icon */}
                            <span className="text-secondary">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!bio && (!platformPoints || platformPoints.length === 0) && (
                     <div className="text-center p-4 border rounded-3 bg-light mt-3">
                        <i className="bi bi-info-circle fs-2 text-muted mb-2"></i>
                        <p className="text-muted mb-0">
                        No detailed profile or platform has been provided by this candidate.
                        </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer bg-light border-top-0 rounded-bottom-4 py-3 px-4"> {/* Softer footer */}
              <button
                type="button"
                className="btn btn-primary" // Changed to primary for a clearer close action
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        /* Custom class to prevent body scrolling when any modal is open */
        body.modal-open-custom {
          overflow: hidden;
        }
        /* Ensure these are correctly scoped if not already in global.css or remove if they are */
        .modal-backdrop-blur {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1050; /* Adjusted z-index */
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.4); /* Slightly darker backdrop */
          -webkit-backdrop-filter: blur(4px); /* Slightly more blur */
          backdrop-filter: blur(4px);
        }
        .modal.fade.show.d-block {
          z-index: 1055; /* Ensure modal is on top of its backdrop */
        }
      `}</style>
    </>
  );
}