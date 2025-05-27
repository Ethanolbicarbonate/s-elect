// src/components/Admin/ResultsView/PositionResultsDisplay.js
"use client";

import CandidateResultRow from "./CandidateResultRow";

export default function PositionResultsDisplay({ positionResult }) {
  if (!positionResult || !positionResult.candidates) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-body text-muted text-center">
          Result data for this position is incomplete or unavailable.
        </div>
      </div>
    );
  }

  const {
    name: positionName,
    maxVotesAllowed,
    candidates,
    totalVotesCastForPosition,
    // winnerCandidateIds, // We can use candidate.isWinner instead
  } = positionResult;

  return (
    <div className="card shadow-sm mb-4 rounded-3 overflow-hidden">
      <div className="card-header bg-white py-3 border-bottom-0">
        {" "}
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="h5 mb-0 text-muted fw-medium">{positionName}</h4>
          <div className="text-end">
            <small className="text-muted d-block">
              (Select {maxVotesAllowed})
            </small>
            <small className="text-muted d-block">
              Total Votes for Position:{" "}
              <span className="fw-medium">
                {totalVotesCastForPosition.toLocaleString()}
              </span>
            </small>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        {" "}
        {/* Remove padding if table takes full width */}
        {candidates.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 align-middle">
              <thead className="table-white">
                <tr>
                  <th className="fw-normal fs-7 text-secondary" style={{ width: "50px" }}>Photo</th>
                  <th className="fw-normal fs-7 text-secondary">Candidate & Affiliation</th>
                  <th className="fw-normal fs-7 text-secondary text-end">Votes</th>
                  <th className="fw-normal fs-7 text-secondary" style={{ width: "30%" }}>Vote Share</th>
                </tr>
              </thead>
              <tbody>
                {/* Candidates are assumed to be pre-sorted by votesReceived descending from API */}
                {candidates.map((candidate) => (
                  <CandidateResultRow
                    key={candidate.id}
                    candidate={candidate}
                    totalVotesForPosition={totalVotesCastForPosition}
                    isWinner={candidate.isWinner} // Assuming API provides this boolean per candidate
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-muted">
            No candidates ran for this position, or no votes were cast.
          </div>
        )}
      </div>
      {/* Optional Footer for notes or legend */}
      {/* <div className="card-footer bg-light text-muted small">
        <i className="bi bi-trophy-fill text-warning me-1"></i> Indicates winner(s). Percentages are of total votes cast for this position.
      </div> */}
    </div>
  );
}
