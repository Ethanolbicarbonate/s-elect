// src/components/Admin/Dashboard/OverviewWidget.js
'use client';

export default function OverviewWidget({ electionStatus = "Not Started", totalVoters = 0, candidatesRegistered = 0 }) {
  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <h5 className="card-title text-primary mb-3">Election Overview</h5>
        <div className="row">
          <div className="col-sm-4 mb-3 mb-sm-0">
            <h6>Status</h6>
            <p className={`fw-bold fs-4 ${electionStatus === "Ongoing" ? "text-success" : "text-secondary"}`}>{electionStatus}</p>
          </div>
          <div className="col-sm-4 mb-3 mb-sm-0">
            <h6>Total Voters</h6>
            <p className="fw-bold fs-4 text-secondary">{totalVoters}</p>
          </div>
          <div className="col-sm-4">
            <h6>Candidates</h6>
            <p className="fw-bold fs-4 text-secondary">{candidatesRegistered}</p>
          </div>
        </div>
      </div>
    </div>
  );
}