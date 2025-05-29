// src/components/Dashboard/PositionDetailedResults.js
"use client";

import CandidateProgressBarItem from "./CandidateProgressBarItem"; // <<< NEW IMPORT

export default function PositionDetailedResults({ position, candidates }) {
  if (!position || !candidates) {
    return (
      <div className="alert alert-info text-center small">
        Select a position to view its detailed results.
      </div>
    );
  }

  const sortedCandidates = [...candidates].sort(
    (a, b) => b.votesReceived - a.votesReceived
  );

  const totalVotesForPosition = sortedCandidates.reduce(
    (sum, cand) => sum + cand.votesReceived,
    0
  );

  return (
    <div className="card h-100 border-0 d-flex flex-column">
      <h5 className="card-title small mb-3 text-secondary text-center">
        {position.name}
      </h5>
      <div className="flex-grow-1 overflow-auto pe-2" style={{height: "180px"}}>
        {sortedCandidates.length > 0 ? (
          <ul className="list-group list-group-flush">
            {sortedCandidates.map((candidate) => (
              // Render the new component for each candidate
              <CandidateProgressBarItem
                key={candidate.id} // Crucial: Provide key here for the mapped component
                candidate={candidate}
                totalVotesForPosition={totalVotesForPosition}
                isWinner={candidate.isWinner} // Pass the isWinner flag directly
              />
            ))}
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
