// src/components/Admin/Dashboard/OverviewWidget.js
"use client"; // This will be a client component as it might involve reactivity or links

import Link from "next/link";
import { format } from "date-fns";

export default function OverviewWidget({ election }) {
  if (!election) {
    return (
      <div className="card h-100 shadow-sm flex-grow-1 p-3 text-center text-muted">
        <i className="bi bi-info-circle display-4 mb-3"></i>
        <p className="mb-0">No election details to display.</p>
      </div>
    );
  }

  const {
    id,
    name,
    effectiveStatus,
    startDate,
    effectiveEndDate,
    scope,
    description,
  } = election;

  const statusColor =
    effectiveStatus === "ONGOING"
      ? "success"
      : effectiveStatus === "UPCOMING"
      ? "info"
      : effectiveStatus === "ENDED"
      ? "dark"
      : effectiveStatus === "PAUSED"
      ? "warning text-dark"
      : "secondary";

  const formattedStartDate = format(new Date(startDate), "MMM dd, yyyy");
  const formattedEndDate = format(new Date(effectiveEndDate), "MMM dd, yyyy");

  return (
    <div className="card h-100 shadow-sm flex-grow-1 rounded-4 overflow-hidden">
      <div className="card-header bg-primary text-white py-2">
        <h5 className="mb-0 h6">Current Election Overview</h5>
      </div>
      <div className="card-body d-flex flex-column">
        <h4 className="card-title mb-2 text-primary">{name}</h4>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <p className="mb-0 small text-muted">
            Period: {formattedStartDate} - {formattedEndDate}
          </p>
          <span className={`badge bg-${statusColor}`}>
            {effectiveStatus?.replace("_", " ")}
          </span>
        </div>

        {description && (
          <p
            className="card-text small text-muted text-truncate mb-3"
            style={{ maxHeight: "3em", overflow: "hidden" }}
            title={description}
          >
            {description}
          </p>
        )}

        <div className="mt-auto pt-3 border-top border-light">
          <Link
            href={`/admin/election-entities?scope=${scope.type}${
              scope.college ? `&college=${scope.college}` : ""
            }`}
            className="btn btn-sm btn-outline-primary w-100"
          >
            <i className="bi bi-gear me-2"></i>Manage Entities
          </Link>
        </div>
      </div>
    </div>
  );
}
