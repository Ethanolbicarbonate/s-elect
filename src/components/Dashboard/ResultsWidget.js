// src/components/Dashboard/ResultsWidget.js
'use client';

export default function ResultsWidget() {
  return (
    <div className="card h-100 border-1 rounded-4">
      <div className="card-body pb-5"> {/* Consider vh-100 or other height controls if needed */}
        <h6 className="card-title text-secondary mb-0">Results</h6>
        <hr className="border-1 border-secondary opacity-20" />
        <div
          className="d-flex align-items-center justify-content-center h-100 text-muted"
          style={{ minHeight: "60vh" }} // Retain min-height or adjust as needed
        >
          <p>
            Election results will be displayed here after the voting period.
          </p>
        </div>
      </div>
    </div>
  );
}