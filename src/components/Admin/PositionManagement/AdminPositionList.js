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
            <th style={{ width: "5%" }}>Order</th>
            <th style={{ width: "25%" }}>Name</th>
            <th style={{ width: "10%" }}>Type</th>
            {/* Hide College on xs, show sm and up */}
            <th style={{ width: "10%" }} className="d-none d-sm-table-cell">
              College (CSC)
            </th>
            <th style={{ width: "10%" }}>Max Votes</th>
            {/* Hide Min Votes on xs, show sm and up */}
            <th style={{ width: "10%" }} className="d-none d-sm-table-cell">
              Min Votes
            </th>
            {/* Hide Description on screens smaller than md */}
            <th style={{ width: "20%" }} className="d-none d-md-table-cell">
              Description
            </th>
            {canManage && (
              <th style={{ width: "10%" }} className="text-end">
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
                    className={`badge bg-${
                      pos.type === "USC" ? "primary" : "info"
                    }`}
                  >
                    {pos.type}
                  </span>
                </td>
                <td className="d-none d-sm-table-cell">
                  {pos.type === "CSC" ? pos.college : "N/A"}
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
                  {pos.description || "N/A"}
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