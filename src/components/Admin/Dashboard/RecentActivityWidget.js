// src/components/Admin/Dashboard/RecentActivityWidget.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import Link from "next/link";

export default function RecentActivityWidget({ userRole }) {
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecentLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // FIX: Request 10 logs
      const res = await fetch(`/api/admin/audit-logs?page=1&limit=8`);
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to load recent activity." }));
        throw new Error(errData.error || `API Error: ${res.status}`);
      }
      const data = await res.json();
      setRecentLogs(data.logs || []);
    } catch (err) {
      console.error("Error fetching recent audit logs:", err);
      setError(err.message || "Failed to load recent activity.");
      setRecentLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
    // Optional: Set up polling for recent activity if truly 'live' updates are desired
    // const interval = setInterval(fetchRecentLogs, 60000); // Refresh every minute
    // return () => clearInterval(interval);
  }, [fetchRecentLogs]);

  return (
    <div className="card shadow-sm w-100 h-100 d-flex flex-column">
      {/* Header */}
      <div className="card-header bg-primary text-white py-2">
        <h5 className="mb-0 h6">Recent Activity</h5>
      </div>

      {/* Body */}
      <div className="card-body p-3 d-flex flex-column overflow-hidden">
        {isLoading ? (
          <div className="text-center p-4 my-auto">
            <div
              className="spinner-border spinner-border-sm text-primary"
              role="status"
            ></div>
            <p className="small text-muted mt-2 mb-0">
              Loading recent activities...
            </p>
          </div>
        ) : error ? (
          <div className="alert alert-danger small py-2 my-auto">{error}</div>
        ) : recentLogs.length === 0 ? (
          <div className="text-center text-muted my-auto d-flex flex-column justify-content-center align-items-center">
            <i className="bi bi-box-seam fs-4 mb-2"></i>
            <p className="small mb-0">No recent activities found.</p>
          </div>
        ) : (
          <ul className="list-group list-group-flush overflow-auto pe-2 flex-grow-1">
            {recentLogs.map((log) => (
              <li
                key={log.id}
                className="list-group-item d-flex align-items-start px-0 py-2 gap-2"
              >
                <div
                  className="text-primary flex-shrink-0"
                  style={{ width: "20px" }}
                >
                  {log.status === "SUCCESS" ? (
                    <i className="bi bi-check-circle-fill fs-7"></i>
                  ) : log.status === "FAILURE" ? (
                    <i className="bi bi-x-circle-fill text-danger fs-7"></i>
                  ) : (
                    <i className="bi bi-info-circle-fill fs-7"></i>
                  )}
                </div>
                <div className="flex-grow-1 text-truncate pe-2 min-w-0">
                  <p
                    className="mb-0 fw-medium text-dark-emphasis fs-7 text-truncate"
                    title={log.actionType.replace(/_/g, " ")}
                  >
                    {log.actionType.replace(/_/g, " ")}
                  </p>
                  {/* FIX: Hide actor details on extra-small/small screens, show from medium (md) up */}
                  <p
                    className="d-none d-md-block mb-0 text-secondary opacity-75 fs-7 text-truncate"
                    title={`${log.actorEmail || log.actorId} ${
                      log.entityType
                        ? `on ${log.entityType} (ID: ${log.entityId || "N/A"})`
                        : ""
                    }`}
                  >
                    by {log.actorEmail || log.actorId}{" "}
                    {log.entityType
                      ? `on ${log.entityType}${
                          log.entityId
                            ? ` (${log.entityId.substring(0, 6)}...)`
                            : ""
                        }`
                      : ""}
                  </p>
                </div>
                <div className="text-end flex-shrink-0">
                  <span className="badge fw-medium bg-light text-dark-emphasis smaller py-1 px-2">
                    {format(new Date(log.timestamp), "MMM d, hh:mm a")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Footer */}
      <div className="card-footer bg-white border-0 text-center py-2">
        <Link
          href="/admin/audit-log"
          className="btn btn-sm btn-outline-secondary w-100"
        >
          <i className="bi bi-journal-text me-2"></i>View All Logs
        </Link>
      </div>
    </div>
  );
}
