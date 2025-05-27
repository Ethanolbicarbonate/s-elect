// src/components/Admin/AuditLog/AuditLogTable.js
"use client";

import { format } from "date-fns"; // A good library for date formatting

export default function AuditLogTable({ logs, isLoading }) {
  if (isLoading && (!logs || logs.length === 0)) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2">Loading audit logs...</p>
      </div>
    );
  }

  if (!isLoading && (!logs || logs.length === 0)) {
    return (
      <div className="alert alert-info text-center">
        No audit logs found matching your criteria.
      </div>
    );
  }

  const formatJsonDetails = (details) => {
    if (!details) return "N/A";
    try {
      // If details is already an object (Prisma Json type often returns it as such)
      if (typeof details === "object") {
        return JSON.stringify(details, null, 2);
      }
      // If it's a string that needs parsing (less common from Prisma Json)
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch (e) {
      return String(details); // Fallback to string if not valid JSON
    }
  };

  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover small align-middle">
        <thead className="table-light">
          <tr>
            <th>Timestamp</th>
            <th>Actor Type</th>
            <th>Actor</th>
            <th>Action Type</th>
            <th>Status</th>
            <th>Entity</th>
            <th>IP Address</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="text-nowrap">
                {format(new Date(log.timestamp), "MMM dd, yyyy, hh:mm:ss a")}
              </td>
              <td>
                <span
                  className={`badge bg-${
                    log.actorType === "ADMIN"
                      ? "warning"
                      : log.actorType === "SYSTEM"
                      ? "info"
                      : "secondary"
                  }`}
                >
                  {log.actorType}
                </span>
              </td>
              <td>{log.actorEmail || log.actorId || "N/A"}</td>
              <td className="text-break">
                {log.actionType.replace(/_/g, " ")}
              </td>
              <td>
                <span
                  className={`badge bg-${
                    log.status === "SUCCESS"
                      ? "success"
                      : log.status === "FAILURE"
                      ? "danger"
                      : "light text-dark"
                  }`}
                >
                  {log.status}
                </span>
              </td>
              <td>
                {log.entityType && log.entityId
                  ? `${log.entityType} (ID: ${log.entityId.substring(0, 8)}...)`
                  : "N/A"}
              </td>
              <td>{log.ipAddress || "N/A"}</td>
              <td>
                {log.details ? (
                  <details className="details-dropdown">
                    <summary
                      className="text-primary"
                      style={{ cursor: "pointer" }}
                    >
                      View
                    </summary>
                    <pre
                      className="bg-light p-2 rounded small mt-1"
                      style={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {formatJsonDetails(log.details)}
                    </pre>
                  </details>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{`
        .details-dropdown summary::marker {
          display: none; /* Hide default marker for a cleaner look */
        }
        .details-dropdown summary {
          list-style: none; /* Remove default list styling */
        }
      `}</style>
    </div>
  );
}
