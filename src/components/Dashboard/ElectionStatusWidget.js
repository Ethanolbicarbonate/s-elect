// src/components/Dashboard/ElectionStatusWidget.js
'use client';

export default function ElectionStatusWidget({ status = "N/A", message = "No election data available." }) {
  let statusColor = "secondary";
  if (status === "ONGOING") statusColor = "success";
  else if (status === "UPCOMING") statusColor = "info";
  else if (status === "ENDED") statusColor = "dark"; // Or other color

  return (
    <div className="card h-100 border-1 rounded-4">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="card-title text-secondary mb-0">Election Status</h6>
          <span className={`badge bg-${statusColor}-soft rounded-circle p-1`}>
            <i className={`bi bi-${statusColor === 'success' ? 'check-circle' : (statusColor === 'info' ? 'clock' : 'info-circle')}-fill text-${statusColor}`}></i>
          </span>
        </div>
        <hr className="border-1 border-secondary opacity-20" />
        <h3 className={`text-${statusColor} fw-light fs-2`}>{status}</h3>
        <p className="card-text text-muted small opacity-75 mt-auto pt-2">
          {message}
        </p>
      </div>
    </div>
  );
}