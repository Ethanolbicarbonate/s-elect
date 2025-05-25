// src/components/StudentView/PartylistInfoCard.js
"use client";

import Image from "next/image";

export default function PartylistInfoCard({ partylist }) {
  if (!partylist) return null;

  const { name, acronym, logoUrl, platform } = partylist; // Type and college omitted as requested

  return (
    <div className="card shadow-sm mb-4 partylist-info-card overflow-hidden"> {/* Added overflow-hidden for rounded corners */}
      <div className="card-body p-lg-4"> {/* More padding on larger screens */}
        <div className="row g-3 g-lg-4 align-items-center"> {/* Different gutter for different screens */}
          
          {/* Logo Column - order-md-first makes it appear first on medium and up */}
          {/* On smaller screens (default order), it will appear based on its position in JSX (which we'll make first) */}
          <div className="col-12 col-lg-auto text-center text-lg-start mb-3 mb-lg-0"> {/* Centered on small, left on large */}
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${name} Logo`}
                width={100} // Slightly larger logo
                height={100}
                className="img-fluid rounded-3 border bg-white p-1" // Added padding and bg for images with transparency
                style={{ objectFit: "contain" }}
                onError={(e) => {
                  // A simple way to hide broken images if next/image error handling is complex
                  const parent = e.currentTarget.parentNode;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = "d-flex align-items-center justify-content-center bg-light rounded-3 border";
                    placeholder.style.width = "100px";
                    placeholder.style.height = "100px";
                    placeholder.innerHTML = '<i class="bi bi-shield-check display-4 text-secondary opacity-25"></i>';
                    parent.replaceChild(placeholder, e.currentTarget);
                  }
                }}
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center bg-light rounded-3 border mx-auto mx-lg-0" // mx-auto for small screen centering
                style={{ width: "100px", height: "100px" }}
              >
                <i className="bi bi-shield-check display-4 text-secondary opacity-25"></i> {/* Changed icon */}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="col-12 col-lg"> {/* Takes remaining space on large screens */}
            <div className="text-center text-lg-start"> {/* Centered text on small/medium, left on large */}
              <h3 className="card-title h4 mb-1 text-primary fw-medium"> {/* Larger, bolder title */}
                {name}
              </h3>
              {acronym && (
                <p className="text-muted mb-2">({acronym})</p>
              )}
            </div>

            {platform && (
              <p
                className="card-text text-secondary mt-2 pe-2" // Removed small and italic for better readability
                style={{ 
                  whiteSpace: "pre-wrap", 
                  maxHeight: "100px", // Limit height for long platforms initially
                  overflowY: "auto", // Allow scroll if platform is very long
                  fontSize: "0.95rem",
                  lineHeight: "1.6"
                }}
              >
                {platform}
              </p>
            )}
            {!platform && (
              <p className="card-text text-muted fst-italic mt-2">
                No specific platform or tagline provided.
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Optional: Subtle accent styling if desired. Removed inline style for cleaner component. */}
      {/* You can add a global class or keep the inline style if you prefer the accent border */}
      {/* <style jsx>{`
        .partylist-info-card {
          // Example: border-top: 5px solid var(--bs-info); 
        }
      `}</style> */}
    </div>
  );
}