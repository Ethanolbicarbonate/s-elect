// src/components/Admin/ElectionManagement/ElectionListTable.js
"use client";

export default function ElectionListTable({
  elections,
  isLoading,
  onEditGeneralClick,
  onExtendClick,
  onEndElectionNow,
}) {
  // --- Loading and Empty States (remain the same) ---
  if (isLoading && elections.length === 0) {
    return (
      <div className="card h-100 border-1 rounded-4 mt-4">
        <div className="card-header rounded-top-4 bg-light">
          <h5 className="mb-0 text-secondary">Manage Election Periods</h5>
        </div>
        <div className="card-body text-center py-4">
          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          >
            <span className="visually-hidden">Loading elections...</span>
          </div>
          Loading elections...
        </div>
      </div>
    );
  }

  if (!isLoading && elections.length === 0) {
    return (
      <div className="card h-100 border-1 rounded-4 mt-4">
        <div className="card-header rounded-top-4 bg-light">
          <h5 className="mb-0 text-secondary">Manage Election Periods</h5>
        </div>
        <div className="card-body text-center text-muted py-4">
          No election periods found. Create one above.
        </div>
      </div>
    );
  }

  return (
    <div className="card h-100 border-1 rounded-4 mt-4">
      <div className="card-header rounded-top-4 bg-light">
        <h5 className="mb-0 text-secondary fw-normal">
          Manage Election Periods
        </h5>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          {/* This enables horizontal scroll on small screens */}
          <table className="table table-hover table-sm small align-middle">
            {/* Added align-middle for better vertical alignment */}
            <thead>
              <tr>
                <th className="fw-normal fs-7 text-secondary">Name</th>
                {/* Hide Start/End Dates on very small screens, show on sm and up */}
                <th className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">Start</th>
                <th className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">End</th>
                <th className="fw-normal fs-7 text-secondary">Status</th>
                {/* Hide Extensions on small screens, show on md and up */}
                <th className="d-none d-md-table-cell fw-normal fs-7 text-secondary">Extensions</th>
                <th className="fw-normal fs-7 text-secondary text-center" style={{ minWidth: "80px" }}>Actions</th>
                {/* Give actions a min-width */}
              </tr>
            </thead>
            <tbody>
              {elections.map((election) => (
                <tr key={election.id}>
                  <td
                    className="fw-normal fs-7 text-truncate"
                    style={{ maxWidth: "20vw" }}
                  >
                    {election.name}
                  </td>
                  <td className="d-none d-sm-table-cell fw-normal fs-7">
                    {new Date(election.startDate).toLocaleDateString()}
                    {/* Date only for smaller views */}{" "}
                    <span className="d-none d-lg-inline text-truncate">
                      {/* Show time on larger screens */}
                      {new Date(election.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="d-none d-sm-table-cell fw-normal fs-7">
                    {new Date(election.endDate).toLocaleDateString()}{" "}
                    <span className="d-none d-lg-inline text-truncate">
                      {new Date(election.endDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`fs-7 fw-normal badge bg-${
                        election.status === "ONGOING"
                          ? "success"
                          : election.status === "UPCOMING"
                          ? "info"
                          : election.status === "ENDED" ||
                            election.status === "ARCHIVED"
                          ? "dark"
                          : "secondary" // PAUSED case
                      }`}
                    >
                      {election.status}
                    </span>
                  </td>
                  <td className="d-none d-md-table-cell">
                    {election.extensions?.length > 0
                      ? election.extensions.map((ext) => (
                          <span
                            key={ext.id}
                            className="badge bg-light text-dark fw-medium me-1 mb-1 p-1 border d-block d-xl-inline-block"
                          >
                            {/* Stack on md, inline on xl */}
                            {ext.college}:{" "}
                            {new Date(ext.extendedEndDate).toLocaleDateString()}
                          </span>
                        ))
                      : "None"}
                  </td>
                  <td>
                    {/* Action buttons can stack on smaller screens if needed, or use a dropdown */}
                    <div className="d-flex flex-nowrap justify-content-end">
                      {/* flex-nowrap to prevent default wrapping too early, relies on table-responsive scroll */}
                      <button
                        className="btn btn-sm btn-outline-secondary me-1 py-0 px-1 border-0"
                        title="Edit General Details"
                        onClick={() => onEditGeneralClick(election)}
                      >
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary me-1 py-0 px-1 border-0"
                        title="Extend for Colleges"
                        onClick={() => onExtendClick(election)}
                        disabled={
                          isLoading ||
                          election.status === "ENDED" ||
                          election.status === "ARCHIVED"
                        }
                      >
                        <i className="bi bi-calendar-plus-fill"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger py-0 px-1 border-0"
                        title="End Election Now"
                        onClick={() =>
                          onEndElectionNow(election.id, election.status)
                        }
                        disabled={
                          isLoading ||
                          election.status === "ENDED" ||
                          election.status === "ARCHIVED"
                        }
                      >
                        <i className="bi bi-x-circle-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
