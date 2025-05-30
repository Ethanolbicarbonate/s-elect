"use client";

export default function ElectionListTable({
  elections,
  isLoading,
  onEditGeneralClick,
  onExtendClick,
  onEndElectionNow,
  onDeleteElection,
}) {
  if (isLoading && elections.length === 0) {
    return (
      <div
        className="card h-100 border-1 rounded-4 mt-4"
        style={{ minHeight: "46vh" }}
      >
        <div className="card-header rounded-top-4 bg-light border-bottom-0">
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
      <div
        className="card h-100 border-1 rounded-4 mt-4"
        style={{ minHeight: "46vh" }}
      >
        <div
          className="card-header rounded-top-4 bg-white border-bottom-0"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        >
          <h5 className="mb-0 text-secondary">Manage Election Periods</h5>
        </div>
        <div className="card-body text-center text-muted py-4">
          No election periods found. Create one above.
        </div>
      </div>
    );
  }

  return (
    <div
      className="card h-100 border-1 rounded-4 mt-4 shadow-sm"
      style={{ minHeight: "46vh" }}
    >
      <div
        className="card-header rounded-top-4 border-bottom-0 bg-white"
        style={{
          backgroundImage:
            "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      >
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
                <th className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">
                  Start
                </th>
                <th className="d-none d-sm-table-cell fw-normal fs-7 text-secondary">
                  End
                </th>
                <th className="fw-normal fs-7 text-secondary">Status</th>
                {/* Hide Extensions on small screens, show on md and up */}
                <th className="d-none d-md-table-cell fw-normal fs-7 text-secondary">
                  Extensions
                </th>
                <th
                  className="fw-normal fs-7 text-end text-secondary"
                  style={{
                    minWidth: "80px",
                    padding: "0.25rem 3.25rem 0.25rem 0.25rem",
                  }}
                >
                  Actions
                </th>
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
                      className={`fs-7 fw-normal opacity-75 badge bg-${
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
                        <i className="bi bi-slash-circle-fill"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger py-0 px-1 border-0" // Changed to btn-danger, added margin
                        title="Delete Election Period Permanently"
                        onClick={() =>
                          onDeleteElection(election.id, election._count)
                        } // Pass ID and counts
                        disabled={isLoading} // Potentially disable based on status too, e.g., not if ONGOING
                      >
                        <i className="bi bi-trash-fill"></i>{" "}
                        {/* Different trash icon for distinct action */}
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
