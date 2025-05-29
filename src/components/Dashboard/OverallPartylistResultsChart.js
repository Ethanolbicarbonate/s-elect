// src/components/Dashboard/OverallPartylistResultsChart.js
"use client";

import Image from "next/image";

export default function OverallPartylistResultsChart({ partylistResults }) {
  // Calculate total votes across all displayed partylists to get correct percentages
  const totalVotesAcrossPartylists = partylistResults.reduce(
    (sum, pl) => sum + pl.totalVotes,
    0
  );

  if (!partylistResults || partylistResults.length === 0) {
    return (
      <div className="text-center text-muted small p-3">
        No partylist data available for this scope.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
      {" "}
      {/* Fixed height and scrollable if many */}
      {partylistResults.map((partylist) => {
        const percentage =
          totalVotesAcrossPartylists > 0
            ? (
                (partylist.totalVotes / totalVotesAcrossPartylists) *
                100
              ).toFixed(1)
            : 0;

        return (
          <div key={partylist.id} className="d-flex align-items-center mb-3">
            {/* Partylist Logo */}
            <div className="flex-shrink-0 me-3">
              {partylist.logoUrl ? (
                <Image
                  src={partylist.logoUrl}
                  alt={`${partylist.name} Logo`}
                  width={40}
                  height={40}
                  className="rounded-circle"
                  style={{ objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }} // Hide broken image
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center bg-light rounded-circle"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="bi bi-flag fs-6 text-secondary opacity-50"></i>
                </div>
              )}
            </div>

            {/* Partylist Name & Progress Bar */}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-normal text-secondary small">
                  {partylist.name} {partylist.acronym}
                </span>
                <span className="fw-medium text-primary small">
                  {percentage}%
                </span>
              </div>
              <div className="progress" style={{ height: "8px" }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{
                    width: `${percentage}%`,
                    transition: "width 0.5s ease-out",
                  }}
                  aria-valuenow={percentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
