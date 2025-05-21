// src/components/Dashboard/VoterStatusWidget.js
'use client';

export default function VoterStatusWidget({ hasVoted = false, electionOngoing = false }) {
  let voteStatus = "Not Voted";
  let voteMessage = "You haven't submitted your vote yet.";
  let statusColor = "danger";

  if (hasVoted) {
    voteStatus = "Voted";
    voteMessage = "Your vote has been successfully submitted.";
    statusColor = "success";
  } else if (!electionOngoing && !hasVoted) {
    voteStatus = "N/A";
    voteMessage = "There is no ongoing election to vote in.";
    statusColor = "secondary";
  }


  return (
    <div className="card h-100 border-1 rounded-4">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="card-title text-secondary mb-0">Vote Status</h6>
          <span className={`badge bg-${statusColor}-soft rounded-circle p-1`}>
            <i className={`bi bi-${statusColor === 'success' ? 'check-circle' : 'exclamation-circle'}-fill text-${statusColor}`}></i>
          </span>
        </div>
        <hr className="border-1 border-secondary opacity-20" />
        <h3 className={`text-${statusColor === 'success' ? statusColor : 'secondary'} fw-light fs-2 ${statusColor !== 'success' ? 'opacity-100' : ''}`}>{voteStatus}</h3>
        <p className="card-text text-muted small opacity-75 mt-auto pt-2">
          {voteMessage}
        </p>
      </div>
    </div>
  );
}