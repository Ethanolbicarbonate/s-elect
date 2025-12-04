"use client";

import { useState } from "react";
import { format } from "date-fns";

const getActorTypeBadgeColor = (actorType) => {
  switch (actorType) {
    case "ADMIN":
      return "bg-warning text-body-secondary";
    case "SYSTEM":
      return "bg-info text-body-secondary";
    case "STUDENT":
      return "bg-success";
    case "UNKNOWN":
      return "bg-secondary";
    default:
      return "bg-body-tertiary text-body-secondary border";
  }
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case "SUCCESS":
      return "bg-success";
    case "FAILURE":
      return "bg-danger";
    default:
      return "bg-body-tertiary text-body-secondary border";
  }
};

export default function AuditLogTable({ logs, isLoading }) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState(null);
  const [selectedLogTimestamp, setSelectedLogTimestamp] = useState(null);

  if (isLoading && (!logs || logs.length === 0)) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading audit logs...</p>
      </div>
    );
  }

  if (!isLoading && (!logs || logs.length === 0)) {
    return (
      <div className="alert alert-info text-center my-4">
        No audit logs found matching your criteria.
      </div>
    );
  }

  const formatJsonDetails = (details) => {
    if (details === null || details === undefined) return "N/A";
    try {
      // If details is already an object (likely from Prisma JSON type), stringify it
      if (typeof details === "object") {
        return JSON.stringify(details, null, 2);
      }
      // If details is a string, try to parse it as JSON then stringify
      // This handles cases where JSON might be stored as a string in the DB
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch (e) {
      // If it's not a valid JSON string or object, return it as is
      return String(details);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLogDetails(formatJsonDetails(log.details));
    setSelectedLogTimestamp(log.timestamp);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedLogDetails(null);
    setSelectedLogTimestamp(null);
  };

  return (
    <>
      <div className="table-responsive p-3">
        <table className="table table-sm table-hover small align-middle">
          <thead className="table-white">
            <tr>
              <th className="fw-normal text-body-secondary">Timestamp</th>
              <th className="fw-normal text-body-secondary">Action</th>
              <th className="fw-normal text-body-secondary">Actor</th>
              <th className="d-none d-sm-table-cell fw-normal text-body-secondary">
                Type
              </th>
              <th className="d-none d-md-table-cell fw-normal text-body-secondary">
                Status
              </th>
              <th className="d-none d-md-table-cell fw-normal text-body-secondary">
                Entity
              </th>
              <th className="d-none d-lg-table-cell fw-normal text-body-secondary">
                IP
              </th>
              <th className="fw-normal text-body-secondary">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-nowrap fs-7">
                  {format(new Date(log.timestamp), "MMM d, HH:mm")}
                  <span className="d-none d-sm-inline">
                    :{format(new Date(log.timestamp), "ss")}
                  </span>
                </td>
                <td className="text-break fs-7">
                  {log.actionType?.replace(/_/g, " ") || "N/A"}
                </td>
                <td
                  className="text-break fs-7"
                  title={log.actorEmail || log.actorId || "N/A"}
                >
                  {log.actorEmail || log.actorId || "N/A"}
                </td>
                <td className="d-none d-sm-table-cell fs-7">
                  <span
                    className={`badge bg-opacity-75 fw-medium ${getActorTypeBadgeColor(
                      log.actorType
                    )}`}
                  >
                    {log.actorType || "N/A"}
                  </span>
                </td>
                <td className="d-none d-md-table-cell fs-7">
                  <span
                    className={`badge bg-opacity-75 fw-medium ${getStatusBadgeColor(
                      log.status
                    )}`}
                  >
                    {log.status || "N/A"}
                  </span>
                </td>
                <td
                  className="d-none d-md-table-cell text-break fs-7"
                  title={
                    log.entityType
                      ? `${log.entityType} (${log.entityId})`
                      : "N/A"
                  }
                >
                  {log.entityType ? (
                    <>
                      {log.entityType}
                      {log.entityId && (
                        <span className="d-none d-lg-inline ms-1">
                          ({log.entityId.substring(0, 6)}...)
                        </span>
                      )}
                    </>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="d-none d-lg-table-cell fs-7">
                  {log.ipAddress || "N/A"}
                </td>
                <td>
                  {log.details ? (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm py-0 px-1"
                      onClick={() => handleViewDetails(log)}
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-body-secondary">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetailsModal && (
        <>
          {/* Custom Backdrop with Blur */}
          <div className="modal-backdrop-blur" onClick={handleCloseModal}></div>

          {/* Modal */}
          <div
            className="modal fade show"
            tabIndex="-1"
            style={{ display: "block", backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={handleCloseModal}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div
                className="modal-content rounded-4 overflow-hidden border-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="modal-header bg-body border-bottom-0"
                  style={{
                    backgroundImage: "var(--bg-grid-subtle)",
                    backgroundSize: "6px 6px",
                  }}
                >
                  <h5 className="modal-title fw-normal text-body-secondary">
                    Log Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {selectedLogTimestamp && (
                    <p className="mb-2 text-body-secondary small">
                      <span className="fw-medium">Timestamp:</span>{" "}
                      {format(
                        new Date(selectedLogTimestamp),
                        "MMM d, yyyy, HH:mm:ss.SSS"
                      )}
                    </p>
                  )}
                  {/* --- NEW ADDITION: Disclaimer Note --- */}
                  <div className="alert alert-info py-2 px-3 mb-3 small text-start">
                    <i className="bi bi-info-circle me-2"></i>
                    This detailed log information is primarily for{" "}
                    <strong>developer debugging and auditing purposes</strong>.
                    It may contain raw data and technical details.
                  </div>
                  {/* --- END NEW ADDITION --- */}
                  <pre
                    className="bg-body-tertiary p-3 rounded-3"
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      fontSize: "0.875rem",
                      maxHeight: "60vh",
                      overflowY: "auto",
                    }}
                  >
                    {selectedLogDetails}
                  </pre>
                </div>
                <div
                  className="modal-footer bg-body border-top-0"
                  style={{
                    backgroundImage: "var(--bg-grid-subtle)",
                    backgroundSize: "6px 6px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm rounded-3"
                    onClick={handleCloseModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
