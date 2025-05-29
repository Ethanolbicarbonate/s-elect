// src/components/Dashboard/CandidateProgressBarItem.js
"use client";

import React, { useState, useEffect } from 'react'; // Import React, useState, useEffect
import Image from 'next/image';
import CountUp from 'react-countup';

export default function CandidateProgressBarItem({ candidate, totalVotesForPosition, isWinner }) {
  // --- HOOKS ARE NOW AT THE TOP-LEVEL OF THIS COMPONENT ---
  const [currentValue, setCurrentValue] = useState(0); // State for this candidate's bar

  const targetPercentage =
    totalVotesForPosition > 0
      ? parseFloat(((candidate.votesReceived / totalVotesForPosition) * 100).toFixed(2))
      : 0;

  // This useEffect ensures the animation starts when the component mounts or candidate/percentage changes
  useEffect(() => {
    setCurrentValue(0); // Reset to 0 to trigger the animation on new percentage or candidate
  }, [targetPercentage]); // Reruns when the target percentage for this candidate changes

  const barColorClass = isWinner
    ? "bg-success"
    : targetPercentage > 0
    ? "bg-warning" // Consistent with your chosen color
    : "bg-secondary opacity-50";

  return (
    <li
      key={candidate.id} // Key is still on the mapping in parent, but good to have here too if standalone
      className={`list-group-item d-flex align-items-center py-2 px-3 border-0 rounded ${
        isWinner ? "bg-success bg-opacity-10" : ""
      }`}
    >
      <div
        className="flex-shrink-0 me-3 rounded-circle"
        style={{
          width: "40px",
          height: "40px",
          overflow: "hidden",
          position: "relative",
          border: "1px solid #ddd",
          backgroundColor: "#f8f9fa",
        }}
      >
        {candidate.photoUrl ? (
          <Image
            src={candidate.photoUrl}
            alt={`${candidate.firstName} Photo`}
            fill
            style={{ objectFit: "cover" }}
            sizes="40px"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="d-flex align-items-center justify-content-center w-100 h-100">
            <i className="bi bi-person-fill fs-5 text-secondary opacity-50"></i>
          </div>
        )}
      </div>

      {/* Candidate Info and Progress Bar */}
      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="fw-medium text-dark-emphasis small">
            {candidate.firstName} {candidate.lastName}
            {candidate.nickname && ` (${candidate.nickname})`}
            {candidate.partylist && !candidate.isIndependent && (
              <span className="badge bg-primary ms-2 fw-medium">
                {candidate.partylist.acronym || candidate.partylist.name}
              </span>
            )}
            {candidate.isIndependent && (
              <span className="badge bg-secondary ms-2 fw-medium">
                Independent
              </span>
            )}
          </span>
          <span className="fw-medium text-primary small">
            {/* CountUp for votes received */}
            <CountUp
              key={candidate.id + candidate.votesReceived}
              end={candidate.votesReceived}
              duration={1.5}
              separator=","
              onUpdate={() => {
                /* no visual bar update from this CountUp directly */
              }}
            />{" "}
            votes (
            {/* CountUp for percentage */}
            <CountUp
              key={candidate.id + targetPercentage + 'perc'}
              end={targetPercentage}
              decimals={2}
              duration={1.5}
              suffix="%"
              onUpdate={(val) => setCurrentValue(val)}
              onEnd={() => setCurrentValue(targetPercentage)}
            />
            )
          </span>
        </div>
        <div className="progress" style={{ height: "8px" }}>
          <div
            className={`progress-bar ${barColorClass}`}
            role="progressbar"
            style={{
              width: `${currentValue}%`,
              transition: "width 3s ease",
            }}
            aria-valuenow={currentValue}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
      </div>
    </li>
  );
}