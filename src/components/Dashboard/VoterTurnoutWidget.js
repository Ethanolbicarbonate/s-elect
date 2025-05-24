// src/components/Dashboard/LiveTallyWidget.js
'use client';

export default function VoterTurnoutWidget() {
  return (
    <div className="card h-100 border-1 rounded-4 shadow-sm">
      <div className="card-body">
        <h6 className="card-title text-secondary mb-0">Voter Turnout</h6>
        <hr className="border-1 border-secondary opacity-20" />
        <div className="d-flex align-items-center justify-content-center h-100 text-muted">
          <p>Live tally data will appear here.</p>
          {/* Example link: <Link href="/live-tally-details">View Details</Link> */}
        </div>
      </div>
    </div>
  );
}