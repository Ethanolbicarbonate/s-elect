// src/components/Voting/ReviewBallotSection.js
"use client";

import React from "react";

// Helper function to find entity names (can be moved to utils if used elsewhere)
const findNameById = (id, list, nameKey = "name") => {
  if (!id || !list || list.length === 0) return "N/A";
  const item = list.find((i) => i.id === id);
  return item ? item[nameKey] : `Unknown (ID: ${id})`;
};

export default function ReviewBallotSection({
  uscSelections, // { positionId: Set<candidateId> }
  cscSelections, // { positionId: Set<candidateId> }
  electionData, // Full election data: { uscPositions, cscPositions, uscCandidates, cscCandidates, ... }
  studentCollegeName, // e.g., "CICT"
  onEditUSC, // Function to go back to USC voting step
  onEditCSC, // Function to go back to CSC voting step
  onSubmit, // Function to trigger final confirmation modal
}) {
  const renderSelectionsForScope = (
    scopeSelections,
    scopePositions,
    scopeCandidates,
    scopeTitle
  ) => {
    if (!scopePositions || scopePositions.length === 0) {
      return (
        <div className="mb-3 text-muted fst-italic">
          No positions were available for {scopeTitle}.
        </div>
      );
    }

    // Sort positions by their 'order' field for consistent display
    const sortedScopePositions = [...scopePositions].sort(
      (a, b) => a.order - b.order
    );

    return (
      <>
        {sortedScopePositions.map((position) => {
          const selectedCandidateIds = Array.from(
            scopeSelections[position.id] || new Set()
          );
          let selectionDisplay;

          if (selectedCandidateIds.length === 0) {
            selectionDisplay = (
              <span className="text-muted fst-italic">No selection made</span>
            );
          } else {
            selectionDisplay = (
              <ul className="list-unstyled mb-0 ps-3">                
                {selectedCandidateIds.map((candId) => (
                  <li key={candId} className="fw-medium text-dark-emphasis">
                    <i className="bi bi-check-circle-fill fs-7 text-success"></i>{" "}
                    {findNameById(candId, scopeCandidates, "firstName")}{" "}
                    {findNameById(candId, scopeCandidates, "lastName")}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <div key={position.id} className="mb-3 pb-3 border-bottom">
              <h6 className="fw-medium text-secondary mb-1">{position.name}</h6>
              {selectionDisplay}
            </div>
          );
        })}
      </>
    );
  };

  const totalUscSelections = Object.values(uscSelections).reduce(
    (sum, set) => sum + set.size,
    0
  );
  const totalCscSelections = Object.values(cscSelections).reduce(
    (sum, set) => sum + set.size,
    0
  );

  const handleDownloadSelections = () => {
    let content = `My Ballot Selections for ${
      electionData?.name || "Election"
    }\n========================================\n\n`;
    content += `UNIVERSITY STUDENT COUNCIL (USC)\n------------------------------\n`;
    (electionData?.uscPositions || [])
      .sort((a, b) => a.order - b.order)
      .forEach((pos) => {
        content += `${pos.name}:\n`;
        const selectedIds = Array.from(uscSelections[pos.id] || new Set());
        if (selectedIds.length > 0) {
          selectedIds.forEach(
            (id) =>
              (content += `  - ${findNameById(
                id,
                electionData.uscCandidates,
                "firstName"
              )} ${findNameById(id, electionData.uscCandidates, "lastName")}\n`)
          );
        } else {
          content += `  (No selection)\n`;
        }
        content += "\n";
      });

    content += `\nCOLLEGE STUDENT COUNCIL (${
      studentCollegeName || "CSC"
    })\n------------------------------\n`;
    (electionData?.cscPositions || [])
      .sort((a, b) => a.order - b.order)
      .forEach((pos) => {
        content += `${pos.name}:\n`;
        const selectedIds = Array.from(cscSelections[pos.id] || new Set());
        if (selectedIds.length > 0) {
          selectedIds.forEach(
            (id) =>
              (content += `  - ${findNameById(
                id,
                electionData.cscCandidates,
                "firstName"
              )} ${findNameById(id, electionData.cscCandidates, "lastName")}\n`)
          );
        } else {
          content += `  (No selection)\n`;
        }
        content += "\n";
      });
    content += `========================================\nDate Downloaded: ${new Date().toLocaleString()}`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `my_ballot_selections_${
      electionData?.id || "election"
    }.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="review-ballot-section my-4">
      <div className="text-center mb-4">
        <h3 className="text-primary">Review Your Ballot</h3>
        <p className="lead text-muted">
          Please carefully review your selections below. You can edit your
          choices before submitting.
        </p>
      </div>

      {/* USC Selections */}
      <div className="card mb-4 shadow-sm rounded-3">
        <div
          className="card-header bg-light d-flex justify-content-between align-items-center rounded-top-3 bg-white"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        >
          <h4 className="h5 mb-0 text-dark-emphasis">
            University Student Council (USC)
          </h4>
          <button
            className="btn custom-btn btn-sm text-secondary border rounded-3"
            onClick={onEditUSC}
          >
            <i className="bi bi-pencil-square me-1"></i> Edit USC
          </button>
        </div>
        <div className="card-body p-4">
          {renderSelectionsForScope(
            uscSelections,
            electionData?.uscPositions,
            electionData?.uscCandidates,
            "USC"
          )}
        </div>
      </div>

      {/* CSC Selections (only if there are CSC positions for the student's college) */}
      {electionData?.cscPositions && electionData.cscPositions.length > 0 && (
        <div className="card mb-4 shadow-sm">
          <div
            className="card-header bg-light d-flex justify-content-between align-items-center bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          >
            <h4 className="h5 mb-0 text-dark-emphasis">
              College Student Council ({studentCollegeName || "CSC"})
            </h4>
            <button
              className="btn custom-btn btn-sm text-secondary border rounded-3"
              onClick={onEditCSC}
            >
              <i className="bi bi-pencil-square me-1"></i> Edit CSC
            </button>
          </div>
          <div className="card-body p-4">
            {renderSelectionsForScope(
              cscSelections,
              electionData?.cscPositions,
              electionData?.cscCandidates,
              `CSC - ${studentCollegeName}`
            )}
          </div>
        </div>
      )}

      {totalUscSelections === 0 && totalCscSelections === 0 && (
        <div className="alert alert-warning text-center">
          You have not made any selections. Are you sure you want to proceed
          with an empty ballot?
        </div>
      )}

      <div className="mt-4 pt-4 border-top d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
        <button
          type="button"
          className="btn custom-btn btn-md text-secondary"
          onClick={handleDownloadSelections}
          title="Download your current selections for your records (before submission)"
        >
          <i className="bi bi-download me-2"></i>Download My Selections (TXT)
        </button>
        <button
          type="button"
          className="btn btn-success btn-lg px-5"
          onClick={onSubmit} // This will trigger the confirmation modal in the parent
        >
          Confirm and Cast My Vote{" "}
          <i className="bi bi-send-check-fill ms-2"></i>
        </button>
      </div>
    </div>
  );
}
