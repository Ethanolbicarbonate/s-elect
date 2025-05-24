// src/components/Admin/PositionManagement/AdminPositionList.js
"use client";

export default function AdminPositionList({
  positions,
  isLoading,
  onEdit,
  onDelete,
  canManage,
}) {
  if (isLoading && positions.length === 0) {
    return <div className="text-center p-4">Loading positions...</div>;
  }

  if (!isLoading && positions.length === 0) {
    return (
      <div className="alert alert-info">
        No positions found for the current scope.
      </div>
    );
  }

  return (
    // Ensure the parent component (<> in election-entities/page.js for this tab) has a card or similar wrapper
    // For standalone use, you might wrap this in a card.
    <div className="table-responsive">
      <table className="table table-hover table-sm small align-middle">
        <thead>
          <tr>
            <th style={{ width: "5%" }} className="fw-normal fs-7 text-secondary">Order</th>
            <th style={{ width: "25%" }} className="fw-normal fs-7 text-secondary">Name</th>
            <th style={{ width: "10%" }} className="fw-normal fs-7 text-secondary">Type</th>
            {/* Hide College on xs, show sm and up */}
            <th style={{ width: "10%" }} className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">
              College
            </th>
            <th style={{ width: "10%" }} className="fw-normal fs-7 text-secondary">Max Votes</th>
            {/* Hide Min Votes on xs, show sm and up */}
            <th style={{ width: "10%" }} className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">
              Min Votes
            </th>
            {/* Hide Description on screens smaller than md */}
            <th style={{ width: "20%" }} className="d-none d-md-table-cell fw-normal fs-7 text-secondary">
              Description
            </th>
            {canManage && (
              <th style={{ width: "10%" }} className="text-end fw-normal fs-7 text-secondary">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {positions
            .sort((a, b) => a.order - b.order)
            .map((pos) => (
              <tr key={pos.id}>
                <td>{pos.order}</td>
                <td>{pos.name}</td>
                <td>
                  <span
                    className={`opacity-75 fw-normal badge bg-${
                      pos.type === "USC" ? "primary" : "info"
                    }`}
                  >
                    {pos.type}
                  </span>
                </td>
                <td className="d-none d-sm-table-cell">
                  {pos.type === "CSC" ? pos.college : <span className="text-secondary opacity-50">N/A</span>}
                </td>
                <td>{pos.maxVotesAllowed}</td>
                <td className="d-none d-sm-table-cell">
                  {pos.minVotesRequired}
                </td>
                <td
                  className="text-truncate d-none d-md-table-cell"
                  style={{ maxWidth: "150px" }}
                  title={pos.description}
                >
                  {pos.description || <span className="text-secondary opacity-50">N/A</span>}
                </td>
                {canManage && (
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary me-1 py-0 px-1 border-0"
                      onClick={() => onEdit(pos)}
                      title="Edit Position"
                    >
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger py-0 px-1 border-0"
                      onClick={() => onDelete(pos.id)}
                      title="Delete Position"
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
