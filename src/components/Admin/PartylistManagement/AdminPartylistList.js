// src/components/Admin/PartylistManagement/AdminPartylistList.js
"use client";

export default function AdminPartylistList({
  partylists,
  isLoading,
  onEdit,
  onDelete,
  canManage,
}) {
  if (isLoading && partylists.length === 0) {
    return <div className="text-center p-4">Loading partylists...</div>;
  }

  if (!isLoading && partylists.length === 0) {
    return (
      <div className="alert alert-info">
        No partylists found for the current scope.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover table-sm small align-middle">
        <thead>
          <tr>
            {/* Hide Logo on xs, show sm and up */}
            <th style={{ width: "5%" }} className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">
              Logo
            </th>
            <th style={{ width: "25%" }} className="fw-normal fs-7 text-secondary">Name</th>
            {/* Hide Acronym on xs, show sm and up */}
            <th style={{ width: "10%" }} className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">
              Acronym
            </th>
            <th style={{ width: "10%" }} className="fw-normal fs-7 text-secondary">Type</th>
            <th style={{ width: "15%" }} className="fw-normal fs-7 text-secondary">College</th>
            {/* Hide Platform on screens smaller than md */}
            <th style={{ width: "25%" }} className="d-none d-md-table-cell fw-normal fs-7 text-secondary">
              Platform Snippet
            </th>
            {canManage && (
              <th style={{ width: "10%" }} className="text-end fw-normal fs-7 text-secondary">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {partylists.map((pl) => (
            <tr key={pl.id}>
              <td className="d-none d-sm-table-cell">
                {pl.logoUrl ? (
                  <img
                    src={pl.logoUrl}
                    alt={`${pl.name} logo`}
                    style={{
                      width: "30px",
                      height: "30px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/30?text=Logo";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      backgroundColor: "#e9ecef",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="bi bi-card-image text-muted"></i>
                  </div>
                )}
              </td>
              <td>{pl.name}</td>
              <td className="d-none d-sm-table-cell">{pl.acronym || <span className="text-secondary opacity-50">N/A</span>}</td>
              <td>
                <span
                  className={`opacity-75 fw-normal badge bg-${
                    pl.type === "USC" ? "primary" : "info"
                  }`}
                >
                  {pl.type}
                </span>
              </td>
              <td>{pl.type === "CSC" ? pl.college : <span className="text-secondary opacity-50">N/A</span>}</td>
              <td
                className="text-truncate d-none d-md-table-cell"
                style={{ maxWidth: "200px" }}
                title={pl.platform}
              >
                {pl.platform || <span className="text-secondary opacity-50">N/A</span>}
              </td>
              {canManage && (
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-primary me-1 py-0 px-1 border-0"
                    onClick={() => onEdit(pl)}
                    title="Edit Partylist"
                  >
                    <i className="bi bi-pencil-fill"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger py-0 px-1 border-0"
                    onClick={() => onDelete(pl.id)}
                    title="Delete Partylist"
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
  );
}
