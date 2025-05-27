// src/components/Admin/ResultsView/CandidateResultRow.js
"use client";

import Image from "next/image";
import CountUp from "react-countup"; // Optional

export default function CandidateResultRow({
  candidate,
  totalVotesForPosition,
  isWinner,
}) {
  if (!candidate) return null;

  const percentage =
    candidate.votesReceived > 0 && totalVotesForPosition > 0
      ? parseFloat(
          ((candidate.votesReceived / totalVotesForPosition) * 100).toFixed(2)
        )
      : 0;

  const barWidth = percentage > 0 ? `${percentage}%` : "0.5%"; // Min width for visibility if 0 votes
  const barColorClass = isWinner
    ? "bg-success"
    : percentage > 0
    ? "bg-info"
    : "bg-secondary opacity-50";

  return (
    <tr className={isWinner ? "table-success" : ""}>
      <td style={{ width: "50px" }}>
        {candidate.photoUrl ? (
          <Image
            src={candidate.photoUrl}
            alt={`${candidate.firstName} ${candidate.lastName}`}
            width={40}
            height={40}
            className="img-fluid rounded-circle"
            style={{ objectFit: "cover" }}
            onError={(e) => {
              /* Basic hide on error */ e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="d-flex align-items-center justify-content-center bg-light rounded-circle"
            style={{ width: "40px", height: "40px" }}
          >
            <i className="bi bi-person-fill fs-5 text-secondary opacity-50"></i>
          </div>
        )}
      </td>
      <td>
        <div className="fw-medium text-dark-emphasis">
          {candidate.firstName} {candidate.lastName}
          {candidate.nickname ? (
            <span className="text-muted small"> ({candidate.nickname})</span>
          ) : (
            ""
          )}
          {isWinner && (
            <i
              className="bi bi-trophy-fill ms-2 text-warning bg-white rounded-5"
              style={{ fontSize: "0.7rem", padding: "0.2rem 0.3rem" }}
              title="Winner"
            ></i>
          )}
        </div>
        <div className="small text-muted">
          {candidate.isIndependent
            ? "Independent"
            : candidate.partylistName || "N/A"}
          {candidate.partylistAcronym && !candidate.isIndependent
            ? ` (${candidate.partylistAcronym})`
            : ""}
        </div>
      </td>
      <td className="text-end fw-medium fs-6 text-primary">
        <CountUp end={candidate.votesReceived} duration={1} separator="," />
      </td>
      <td style={{ width: "30%" }}>
        <div
          className="progress bg-light border"
          role="progressbar"
          aria-label={`Votes for ${candidate.firstName}`}
          aria-valuenow={percentage}
          aria-valuemin="0"
          aria-valuemax="100"
          style={{ height: "20px" }}
        >
          <div
            className={`progress-bar ${barColorClass} d-flex align-items-center justify-content-center`}
            style={{
              width: barWidth,
              transition: "width 0.5s ease-in-out",
              color: percentage === 0 ? "secondary" : "white", // gray text for 0%
            }}
          >
            {percentage === 0 ? "0%" : percentage > 10 ? `${percentage}%` : ""}
          </div>
        </div>

        {percentage <= 10 && percentage > 0 && (
          <div
            className="text-end small fw-medium"
            style={{ color: isWinner ? "var(--bs-success)" : "var(--bs-info)" }}
          >
            {percentage}%
          </div>
        )}
      </td>
    </tr>
  );
}
