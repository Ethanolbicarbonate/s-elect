"use client";

import React from "react";

export default function AdminCandidateList({
  candidates,
  isLoading,
  onEdit,
  onDelete,
  canManage,
  managementScope,
  partylists: allPartylistsInScope,
}) {
  if (isLoading && candidates.length === 0) {
    return <div className="text-center p-4">Loading candidates...</div>;
  }

  if (!isLoading && candidates.length === 0) {
    return (
      <div className="alert alert-info mt-3">
        No candidates found for the current scope and filters.
      </div>
    );
  }

  const groupedCandidates = candidates.reduce((acc, candidate) => {
    const partylistIdKey =
      candidate.isIndependent || !candidate.partylistId
        ? "INDEPENDENT"
        : candidate.partylistId;
    if (!acc[partylistIdKey]) {
      acc[partylistIdKey] = [];
    }
    acc[partylistIdKey].push(candidate);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(groupedCandidates).sort((a, b) => {
    if (a === "INDEPENDENT") return 1;
    if (b === "INDEPENDENT") return -1;
    // Find partylist names for sorting from the passed 'allPartylistsInScope'
    const partylistA = allPartylistsInScope?.find((p) => p.id === a);
    const partylistB = allPartylistsInScope?.find((p) => p.id === b);
    const nameA = partylistA?.name || a; // Fallback to ID if somehow not found
    const nameB = partylistB?.name || b; // Fallback to ID if somehow not found
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="mt-3">
      {sortedGroupKeys.map((partylistIdKey) => {
        // Renamed variable for clarity
        const group = groupedCandidates[partylistIdKey];

        // --- CORRECTED LOGIC FOR groupName AND partylistDetails ---
        let groupName = "Unknown Group";
        let partylistForHeader = null; // To store the full partylist object for the header

        if (partylistIdKey === "INDEPENDENT") {
          groupName = "Independent Candidates";
        } else if (allPartylistsInScope && allPartylistsInScope.length > 0) {
          partylistForHeader = allPartylistsInScope.find(
            (p) => p.id === partylistIdKey
          );
          if (partylistForHeader) {
            groupName = partylistForHeader.name;
          } else {
            // Fallback if partylist ID from candidate doesn't match any in the provided list
            // This shouldn't happen if data is consistent
            groupName = `Partylist (ID: ${partylistIdKey})`;
            console.warn(
              `Partylist with ID ${partylistIdKey} not found in allPartylistsInScope for header.`
            );
          }
        } else {
          // Fallback if allPartylistsInScope is not available or empty, but we have a partylist ID
          groupName = `Partylist (ID: ${partylistIdKey})`;
        }

        return (
          <div key={partylistIdKey} className="mb-4 card rounded-3 pb-4">
            <div className="card-header bg-light py-2 rounded-top-3">
              <h5 className="mb-0 fw-normal fs-6 text-secondary">
                {groupName}
                {partylistForHeader && (
                  <small className="ms-2 text-muted">
                    ({partylistForHeader.type}
                    {partylistForHeader.college
                      ? ` - ${partylistForHeader.college}`
                      : ""}
                    )
                  </small>
                )}
              </h5>
            </div>
            <div className="table-responsive px-2">
              {" "}
              {/* This div handles horizontal scrolling */}
              <table className="table table-hover table-sm small align-middle mb-0">
                <thead>
                  <tr>
                    {/* Hide Photo on xs screens */}
                    <th
                      style={{ width: "5%" }}
                      className="d-none d-sm-table-cell fw-normal fs-7 text-secondary"
                    >
                      Photo
                    </th>
                    <th style={{ width: "30%" }} className="fw-normal fs-7 text-secondary">Name</th>
                    <th style={{ width: "30%" }} className="fw-normal fs-7 text-secondary">Position</th>
                    {/* Hide Bio on screens smaller than md */}
                    <th
                      style={{ width: "25%" }}
                      className="d-none d-md-table-cell fw-normal fs-7 text-secondary"
                    >
                      Bio Snippet
                    </th>
                    {canManage && (
                      <th style={{ width: "10%" }} className="text-end fw-normal fs-7 text-secondary">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {group
                    .sort(
                      (a, b) =>
                        (a.position?.order || 0) - (b.position?.order || 0) ||
                        a.lastName.localeCompare(b.lastName)
                    )
                    .map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="d-none d-sm-table-cell">
                          {candidate.photoUrl ? (
                            <img
                              src={candidate.photoUrl}
                              alt={`${candidate.firstName} ${candidate.lastName}`}
                              style={{
                                width: "35px",
                                height: "35px",
                                objectFit: "cover",
                                borderRadius: "50%",
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "https://via.placeholder.com/35?text=Pic";
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "35px",
                                height: "35px",
                                backgroundColor: "#e9ecef",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <i className="bi bi-person-fill text-muted fs-5"></i>
                            </div>
                          )}
                        </td>
                        <td>
                          {candidate.firstName} {candidate.lastName}{" "}
                          {candidate.nickname ? (
                            <span className="d-none d-lg-inline">
                              ({candidate.nickname})
                            </span>
                          ) : (
                            ""
                          )}
                        </td>
                        <td>{candidate.position?.name || <span className="text-secondary opacity-50">N/A</span>}</td>
                        <td
                          className="text-truncate d-none d-md-table-cell"
                          style={{ maxWidth: "150px" }}
                          title={candidate.bio}
                        >
                          {candidate.bio || <span className="text-secondary opacity-50">N/A</span>}
                        </td>
                        {canManage && (
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary me-1 py-0 px-1 border-0"
                              onClick={() => onEdit(candidate)}
                              title="Edit Candidate"
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger py-0 px-1 border-0"
                              onClick={() => onDelete(candidate.id)}
                              title="Delete Candidate"
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
