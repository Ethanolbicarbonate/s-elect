"use client";

import React from "react";

export default function AdminCandidateList({
  candidates,
  isLoading,
  onEdit,
  onDelete,
  canManage,
  partylists: allPartylistsInScope,
}) {
  if (isLoading && candidates.length === 0) {
    return <div className="text-center p-4">Loading candidates...</div>;
  }

  if (!isLoading && candidates.length === 0) {
    return (
      <div className="alert alert-info">
        No candidates found for the current scope and filters.
      </div>
    );
  }

  console.log(
    "[AdminCandidateList] Props received - candidates:",
    JSON.stringify(candidates.slice(0, 2))
  );
  console.log(
    "[AdminCandidateList] Props received - allPartylistsInScope:",
    JSON.stringify(allPartylistsInScope)
  );

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

    const partylistA = allPartylistsInScope?.find((p) => p.id === a);
    const partylistB = allPartylistsInScope?.find((p) => p.id === b);
    const nameA = partylistA?.name || a;
    const nameB = partylistB?.name || b;
    return nameA.localeCompare(nameB);
  });
  console.log("[AdminCandidateList] Sorted Group Keys:", sortedGroupKeys);

  return (
    <div className="mt-3">
      {sortedGroupKeys.map((partylistIdKey) => {
        const group = groupedCandidates[partylistIdKey];
        let groupName = "Error: Partylist Name Not Found";
        let partylistForHeader = null;

        console.log(
          `[AdminCandidateList] Processing group key: ${partylistIdKey}`
        );

        if (partylistIdKey === "INDEPENDENT") {
          groupName = "Independent Candidates";
        } else {
          if (allPartylistsInScope && allPartylistsInScope.length > 0) {
            partylistForHeader = allPartylistsInScope.find(
              (p) => p.id === partylistIdKey
            );
            if (partylistForHeader) {
              groupName = partylistForHeader.name;
              // console.log(`[AdminCandidateList] Found partylist: ${partylistForHeader.name} (ID: ${partylistIdKey})`);
            } else {
              groupName = `Partylist (ID: ${partylistIdKey})`; // Fallback if not found
              console.warn(
                `[AdminCandidateList] Partylist with ID ${partylistIdKey} NOT FOUND in allPartylistsInScope. Displaying ID. allPartylistsInScope content:`,
                JSON.stringify(allPartylistsInScope)
              );
            }
          } else {
            groupName = `Partylist (ID: ${partylistIdKey}) - No Partylist Data Provided`; // Fallback if list is empty/null
            console.warn(
              `[AdminCandidateList] allPartylistsInScope is empty or undefined for key ${partylistIdKey}.`
            );
          }
        }

        return (
          <div
            key={partylistIdKey}
            className="mb-4 card rounded-3 pb-4 shadow-sm"
          >
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
                    <th
                      style={{ width: "30%" }}
                      className="fw-normal fs-7 text-secondary"
                    >
                      Name
                    </th>
                    <th
                      style={{ width: "30%" }}
                      className="fw-normal fs-7 text-secondary"
                    >
                      Position
                    </th>
                    {/* Hide Bio on screens smaller than md */}
                    <th
                      style={{ width: "25%" }}
                      className="d-none d-md-table-cell fw-normal fs-7 text-secondary"
                    >
                      Bio Snippet
                    </th>
                    {canManage && (
                      <th
                        style={{ width: "10%" }}
                        className="text-end fw-normal fs-7 text-secondary"
                      >
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
                        <td>
                          {candidate.position?.name || (
                            <span className="text-secondary opacity-50">
                              N/A
                            </span>
                          )}
                        </td>
                        <td
                          className="text-truncate d-none d-md-table-cell"
                          style={{ maxWidth: "150px" }}
                          title={candidate.bio}
                        >
                          {candidate.bio || (
                            <span className="text-secondary opacity-50">
                              N/A
                            </span>
                          )}
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
