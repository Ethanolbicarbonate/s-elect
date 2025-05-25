// src/components/StudentView/ScopedCandidateViewer.js
"use client";

import { useState, useEffect, useMemo } from "react";
import CandidateCard from "./CandidateCard"; // Will create next
import PartylistInfoCard from "./PartylistInfoCard"; // Will create if needed for partylist filter view
import CandidateDetailModal from "./CandidateDetailModal"; // Will create next

// Define standard positions for consistent ordering and filtering labels
// These should ideally match the ones used in PositionForm.js
const USC_STANDARD_POSITIONS_ORDER = [
  "CHAIRPERSON",
  "VICE CHAIRPERSON",
  "COUNCILOR",
];
const CSC_STANDARD_POSITIONS_ORDER = [
  "CHAIRPERSON",
  "VICE CHAIRPERSON",
  "SECRETARY",
  "ASST SECRETARY",
  "TREASURER",
  "ASST TREASURER",
  "AUDITOR",
  "ASST AUDITOR",
  "BUSINESS MANAGER",
  "ASST. BUSINESS MANAGER",
  "PUBLIC INFORMATION OFFICER",
  "ASST. PUBLIC INFORMATION OFFICER",
  "COLLEGE REPRESENTATIVES",
];

export default function ScopedCandidateViewer({
  scopeType, // 'USC' or 'CSC'
  scopeDisplayName, // e.g., "USC (University-Wide)" or "CSC - CICT"
  positions, // Array of position objects for this scope
  partylists, // Array of partylist objects for this scope
  candidates, // Array of candidate objects for this scope
  electionStatus,
  // studentCollege // Only needed if CSC and we need to pass it further, but data is already scoped
}) {
  const [filterPositionId, setFilterPositionId] = useState(""); // ID of selected position to filter by
  const [filterPartylistId, setFilterPartylistId] = useState(""); // ID of selected partylist or 'INDEPENDENT'
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCandidateForModal, setSelectedCandidateForModal] =
    useState(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  // Reset filters when scope changes (e.g., user switches tabs from USC to CSC)
  useEffect(() => {
    setFilterPositionId("");
    setFilterPartylistId("");
    setSearchTerm("");
  }, [scopeType]);

  const handleShowCandidateDetails = (candidate) => {
    setSelectedCandidateForModal(candidate);
    setShowCandidateModal(true);
  };

  const handleCloseCandidateModal = () => {
    setShowCandidateModal(false);
    setSelectedCandidateForModal(null);
  };

  // Memoize filtered candidates to avoid re-computation on every render
  const filteredAndSearchedCandidates = useMemo(() => {
    let processedCandidates = [...candidates];

    if (filterPositionId) {
      processedCandidates = processedCandidates.filter(
        (c) => c.positionId === filterPositionId
      );
    }

    if (filterPartylistId) {
      if (filterPartylistId === "INDEPENDENT") {
        processedCandidates = processedCandidates.filter(
          (c) => c.isIndependent || !c.partylistId
        );
      } else {
        processedCandidates = processedCandidates.filter(
          (c) => c.partylistId === filterPartylistId
        );
      }
    }

    if (searchTerm.trim() !== "") {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedCandidates = processedCandidates.filter(
        (c) =>
          c.firstName.toLowerCase().includes(lowerSearchTerm) ||
          c.lastName.toLowerCase().includes(lowerSearchTerm) ||
          (c.nickname && c.nickname.toLowerCase().includes(lowerSearchTerm)) ||
          (c.position?.name &&
            c.position.name.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return processedCandidates;
  }, [candidates, filterPositionId, filterPartylistId, searchTerm]);

  // Determine which positions to display based on filters and available candidates
  const displayablePositions = useMemo(() => {
    const relevantPositionOrder =
      scopeType === "USC"
        ? USC_STANDARD_POSITIONS_ORDER
        : CSC_STANDARD_POSITIONS_ORDER;

    let positionsToShow = positions
      .filter((p) => {
        // If a position filter is active, only show that one
        if (filterPositionId) return p.id === filterPositionId;
        // Otherwise, show positions that have candidates after other filters (partylist, search)
        return filteredAndSearchedCandidates.some((c) => c.positionId === p.id);
      })
      .sort((a, b) => {
        const orderA = relevantPositionOrder.indexOf(a.name.toUpperCase());
        const orderB = relevantPositionOrder.indexOf(b.name.toUpperCase());
        // If both are standard, sort by predefined order
        if (orderA !== -1 && orderB !== -1) return orderA - orderB;
        // If one is standard and other is not, standard comes first
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        // If both are custom, sort by original DB order, then name
        return (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name);
      });

    return positionsToShow;
  }, [positions, filterPositionId, filteredAndSearchedCandidates, scopeType]);

  const selectedPartylistForInfoCard = useMemo(() => {
    if (filterPartylistId && filterPartylistId !== "INDEPENDENT") {
      return partylists.find((p) => p.id === filterPartylistId);
    }
    return null;
  }, [filterPartylistId, partylists]);

  const handleClearFilters = () => {
    setFilterPositionId("");
    setFilterPartylistId("");
    setSearchTerm("");
  };

  const noFiltersActive =
    !filterPositionId && !filterPartylistId && !searchTerm;

  return (
    <div className="scoped-candidate-viewer p-2">
      <h3 className="mb-3 h4 text-primary text-center">
        {scopeDisplayName} Candidates
      </h3>

      {/* Filter Controls */}
      <div className="card mb-4 rounded-2">
        <div className="card-body bg-light-subtle rounded-2">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label
                htmlFor={`${scopeType}-filterPosition`}
                className="form-label form-label-sm fs-7 ms-2 text-secondary"
              >
                Filter by Position
              </label>
              <select
                id={`${scopeType}-filterPosition`}
                className="form-select form-select-sm"
                value={filterPositionId}
                onChange={(e) => {
                  setFilterPositionId(e.target.value);
                  setFilterPartylistId(
                    ""
                  ); /* Clear partylist filter when position changes */
                }}
              >
                <option value="">All Positions</option>
                {positions
                  .sort(
                    (a, b) =>
                      (a.order || 0) - (b.order || 0) ||
                      a.name.localeCompare(b.name)
                  )
                  .map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-md-4">
              <label
                htmlFor={`${scopeType}-filterPartylist`}
                className="form-label form-label-sm fs-7 ms-2 text-secondary"
              >
                Filter by Partylist
              </label>
              <select
                id={`${scopeType}-filterPartylist`}
                className="form-select form-select-sm"
                value={filterPartylistId}
                onChange={(e) => {
                  setFilterPartylistId(e.target.value);
                  setFilterPositionId(""); /* Clear position filter */
                }}
              >
                <option value="">All Partylists & Independents</option>
                {partylists
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                <option value="INDEPENDENT">Independent Candidates</option>
              </select>
            </div>
            <div className="col-md-3">
              <label
                htmlFor={`${scopeType}-searchCandidate`}
                className="form-label form-label-sm fs-7 ms-2 text-secondary"
              >
                Search Candidates
              </label>
              <input
                type="text"
                id={`${scopeType}-searchCandidate`}
                className="form-control form-control-sm"
                placeholder="Name or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-1">
              <button
                className="btn btn-sm btn-outline-0 w-100 bg-secondary-subtle border-secondary-subtle mt-2"
                onClick={handleClearFilters}
                title="Clear all filters"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Display Area */}
      {isLoadingCandidates && (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!isLoadingCandidates && filteredAndSearchedCandidates.length === 0 && (
        <div className="alert alert-secondary text-center">
          No candidates match your current filters.
        </div>
      )}

      {/* Display Partylist Info Card if a partylist is filtered */}
      {selectedPartylistForInfoCard && (
        <div className="mb-4">
          <PartylistInfoCard partylist={selectedPartylistForInfoCard} />
        </div>
      )}
      {filterPartylistId === "INDEPENDENT" && (
        <h4 className="mb-3 text-muted border-bottom pb-2 pt-3 text-center">
          Independent Candidates
        </h4>
      )}

      {/* 
        If a partylist filter is active, we display all candidates for that partylist (or independents)
        grouped by their positions.
        If no partylist filter, but a position filter is active, we display only that position.
        If no filters, display all positions with their candidates.
      */}
      {displayablePositions.map(
        (position) =>
          // Only render the position section if:
          // 1. No partylist filter is active OR
          // 2. A partylist filter is active AND this position has candidates from that filtered partylist/independent group
          (!filterPartylistId ||
            (filterPartylistId &&
              filteredAndSearchedCandidates.some(
                (c) => c.positionId === position.id
              ))) && (
            <div
              key={position.id}
              className="mt-5 mb-2 position-section border rounded-2"

            >
              <div className="bg-light-subtle rounded-top-2 p-3 mb-4 border-bottom">
                <h4 className="position-title text-center lh-1 mb-0">
                  {position.name}
                  <br></br>
                  <small className="text-secondary fs-7 ms-2">
                    (Maximum Votes: {position.maxVotesAllowed})
                  </small>
                </h4>
              </div>
              <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-4 justify-content-center px-2 pb-4">
                {" "}
                {filteredAndSearchedCandidates
                  .filter((candidate) => candidate.positionId === position.id)
                  // .sort((a,b) => a.lastName.localeCompare(b.lastName)) // Already sorted by parent, or can re-sort if needed
                  .map((candidate) => (
                    <div key={candidate.id} className="col d-flex">
                      {/* d-flex for equal height cards if using flex-grow-1 in card */}
                      <CandidateCard
                        candidate={candidate}
                        onViewDetails={() =>
                          handleShowCandidateDetails(candidate)
                        }
                      />
                    </div>
                  ))}
                {filteredAndSearchedCandidates.filter(
                  (candidate) => candidate.positionId === position.id
                ).length === 0 &&
                  !selectedPartylistForInfoCard &&
                  filterPositionId === position.id && ( // Show only if this position specifically is filtered and has no candidates
                    <div className="col-12">
                      <p className="text-muted fst-italic">
                        No candidates currently listed for this position under
                        the active filters.
                      </p>
                    </div>
                  )}
              </div>
              {/* TODO: Add Next/Previous buttons for horizontal scrolling if many candidates in a row */}
            </div>
          )
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidateForModal && (
        <CandidateDetailModal
          show={showCandidateModal}
          onClose={handleCloseCandidateModal}
          candidate={selectedCandidateForModal}
        />
      )}
    </div>
  );
}

// Placeholder for isLoadingCandidates if not passed directly
const isLoadingCandidates = false;
