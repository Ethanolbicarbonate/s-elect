// src/components/Dashboard/PositionDetailedResults.js
"use client";

import Image from "next/image";
import CountUp from "react-countup"; // Optional

export default function PositionDetailedResults({ position, candidates }) {
  if (!position || !candidates) {
    return (
      <div className="alert alert-info text-center small">
        Select a position to view its detailed results.
      </div>
    );
  }

  // Sort candidates by votes received (descending)
  const sortedCandidates = [...candidates].sort(
    (a, b) => b.votesReceived - a.votesReceived
  );

  // Determine total votes for this position
  const totalVotesForPosition = sortedCandidates.reduce(
    (sum, cand) => sum + cand.votesReceived,
    0
  );

  return (
    <div className="card h-100 border-0 d-flex flex-column">
      {" "}
      {/* Ensure card takes available height */}
      <h5 className="card-title small mb-3 text-secondary text-center">
        {position.name}
      </h5>
      <div className="flex-grow-1 overflow-auto pe-2" style={{height: "180px"}}>
        {" "}
        {/* Scrollable area for candidates */}
        {sortedCandidates.length > 0 ? (
          <ul className="list-group list-group-flush">
            {sortedCandidates.map((candidate) => {
              const percentage =
                totalVotesForPosition > 0
                  ? parseFloat(
                      (
                        (candidate.votesReceived / totalVotesForPosition) *
                        100
                      ).toFixed(2)
                    )
                  : 0;

              const barWidth = percentage > 0 ? `${percentage}%` : "0.5%"; // Min width for visibility if 0 votes
              const isWinner = candidate.isWinner; // backend sets this flag
              const barColorClass = isWinner
                ? "bg-success"
                : percentage > 0
                ? "bg-warning"
                : "bg-secondary opacity-50";

              return (
                <li
                  key={candidate.id}
                  className={`list-group-item d-flex align-items-center py-2 px-3 border-0 rounded ${
                    isWinner ? "bg-success bg-opacity-10" : ""
                  }`}
                >
                  <div
                    className="flex-shrink-0 me-3 rounded-circle"
                    style={{
                      width: "40px",
                      height: "40px",
                      overflow: "hidden",
                      position: "relative",
                      border: "1px solid #ddd",
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    {candidate.photoUrl ? (
                      <Image
                        src={candidate.photoUrl}
                        alt={`${candidate.firstName} Photo`}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="40px"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center w-100 h-100">
                        <i className="bi bi-person-fill fs-5 text-secondary opacity-50"></i>
                      </div>
                    )}
                  </div>

                  {/* Candidate Info and Progress Bar */}
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-medium text-dark-emphasis small">
                        {candidate.firstName} {candidate.lastName}
                        {candidate.nickname && ` (${candidate.nickname})`}
                        {candidate.partylist && !candidate.isIndependent && (
                          <span className="badge bg-primary ms-2 fw-medium">
                            {candidate.partylist.acronym ||
                              candidate.partylist.name}
                          </span>
                        )}
                        {candidate.isIndependent && (
                          <span className="badge bg-secondary ms-2 fw-medium">
                            Independent
                          </span>
                        )}
                      </span>
                      <span className="fw-medium text-primary small">
                        <CountUp
                          end={candidate.votesReceived}
                          duration={1.5}
                          separator=","
                        />{" "}
                        votes ({percentage}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
                      <div
                        className={`progress-bar ${barColorClass}`}
                        role="progressbar"
                        style={{
                          width: barWidth,
                          transition: "width 0.5s ease-out",
                        }}
                        aria-valuenow={percentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-muted small p-3">
            No candidates found for this position.
          </div>
        )}
      </div>
    </div>
  );
}
