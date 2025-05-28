"use client";

import Image from "next/image";
import CountUp from "react-countup";
import { useState, useEffect } from "react";

export default function CandidateResultRow({
  candidate,
  totalVotesForPosition,
  isWinner,
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [candidate?.photoUrl]);

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
      <td style={{ width: "50px" }} className="align-middle text-center">
        {" "}
        <div
          className="rounded-circle"
          style={{
            width: "40px",
            height: "40px",
            overflow: "hidden",
            position: "relative",
            border: "2px solid #dee2e6",
            backgroundColor: "#f8f9fa",
            margin: "0 auto",
          }}
        >
          {candidate.photoUrl && !imageError ? (
            <Image
              src={candidate.photoUrl}
              alt={`${candidate.firstName} ${candidate.lastName}`}
              fill
              style={{ objectFit: "cover" }}
              sizes="40px"
              onError={() => {
                console.warn(
                  `Failed to load image for ${candidate.firstName} ${candidate.lastName}: ${candidate.photoUrl}`
                );
                setImageError(true);
              }}
            />
          ) : (
            // Fallback div (shown if no photoUrl or if imageError is true)
            <div
              className="d-flex align-items-center justify-content-center w-100 h-100"
              title={`${candidate.firstName} ${candidate.lastName} (No photo)`}
            >
              <i className="bi bi-person-fill fs-5 text-secondary opacity-50"></i>
            </div>
          )}
        </div>
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
