// src/components/Voting/VotingSection.js
"use client";

import CandidateSelectionCard from "./CandidateSelectionCard"; // We'll create this next
// CandidateDetailModal might be triggered from within CandidateSelectionCard or passed up

export default function VotingSection({
  scopeTitle, // e.g., "University Student Council (USC) Ballot"
  positions, // Array of position objects for this scope
  candidates, // Array of ALL candidate objects for this scope
  currentSelections, // Object: { positionId: Set<candidateId> }
  onUpdateSelection, // Function: (positionId, candidateId) => void
  onViewCandidateDetails, // Function: (candidate) => void
}) {
  if (!positions || positions.length === 0) {
    return (
      <div className="my-4 p-3 text-center text-muted border rounded">
        No positions available for this section of the ballot.
      </div>
    );
  }

  // Sort positions by their 'order' field
  const sortedPositions = [...positions].sort((a, b) => a.order - b.order);

  return (
    <div className="voting-section my-4">
      <h3 className="text-center text-primary pb-5 pt-4">{scopeTitle}</h3>

      {sortedPositions.map((position) => {
        const candidatesForPosition = candidates
          .filter((c) => c.positionId === position.id)
          .sort((a, b) => a.lastName.localeCompare(b.lastName)); // Sort candidates alphabetically by last name

        const selectionsForThisPosition =
          currentSelections[position.id] || new Set();
        const maxReached =
          selectionsForThisPosition.size >= position.maxVotesAllowed;

        return (
          <div
            key={position.id}
            className="position-group mb-5 card shadow-sm rounded-3"
          >
            <div
              className="card-header bg-light rounded-top-3 bg-white"
              style={{
                backgroundImage:
                  "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                backgroundSize: "8px 8px",
              }}
            >
              <h4 className="h5 mb-0 fw-normal text-muted">{position.name}</h4>
              <small className="text-secondary opacity-75">
                (Select
                {position.maxVotesAllowed > 1
                  ? ` up to ${position.maxVotesAllowed}`
                  : " one"}
                {position.maxVotesAllowed > 1 &&
                  ` - ${selectionsForThisPosition.size} selected`}
                )
              </small>
            </div>
            <div className="card-body bg-light rounded-bottom-3">
              {candidatesForPosition.length > 0 ? (
                <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 justify-content-center">
                  {candidatesForPosition.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="col d-flex align-items-stretch"
                    >
                      <CandidateSelectionCard
                        candidate={candidate}
                        isSelected={selectionsForThisPosition.has(candidate.id)}
                        onSelectToggle={() =>
                          onUpdateSelection(position.id, candidate.id)
                        }
                        // Disable if max reached AND this candidate is not already selected
                        isDisabled={
                          maxReached &&
                          !selectionsForThisPosition.has(candidate.id)
                        }
                        onViewDetails={() => onViewCandidateDetails(candidate)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted fst-italic p-3 text-center">
                  No candidates are running for this position.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
