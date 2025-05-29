// src/components/Dashboard/OverallPartylistResultsChart.js
"use client";

import Image from "next/image";
import CountUp from "react-countup";
import { useState, useEffect } from "react"; // <<< Make sure useState and useEffect are imported

export default function OverallPartylistResultsChart({ partylistResults }) {
  const totalVotesAcrossPartylists = partylistResults.reduce(
    (sum, pl) => sum + pl.totalVotes,
    0
  );

  if (!partylistResults || partylistResults.length === 0) {
    return (
      <div className="text-center text-muted small p-3">
        No partylist data available for this scope.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
      {partylistResults.map((partylist) => {
        const targetPercentage =
          totalVotesAcrossPartylists > 0
            ? parseFloat(((partylist.totalVotes / totalVotesAcrossPartylists) * 100).toFixed(1))
            : 0;

        const [currentValue, setCurrentValue] = useState(0);
        useEffect(() => {
          if (currentValue === 0) {
             setCurrentValue(0);
          }
        }, [targetPercentage]);

        return (
          <div key={partylist.id} className="d-flex align-items-center mb-3">
            <div className="flex-shrink-0 me-3">
              {partylist.logoUrl ? (
                <Image
                  src={partylist.logoUrl}
                  alt={`${partylist.name} Logo`}
                  width={40}
                  height={40}
                  className="rounded-2"
                  style={{ objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center bg-light rounded-circle"
                  style={{ width: "40px", height: "40px" }}
                >
                  <i className="bi bi-flag fs-6 text-secondary opacity-50"></i>
                </div>
              )}
            </div>

            {/* Partylist Name & Progress Bar */}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-normal text-secondary small">
                  {partylist.name} {partylist.acronym}
                </span>
                <span className="fw-medium text-primary small">
                  <CountUp
                    key={partylist.id + targetPercentage} // Key to re-trigger CountUp animation
                    start={0} // Start from 0 for animation
                    end={targetPercentage}
                    decimals={1}
                    duration={1.5}
                    suffix="%"
                    // This is the crucial part: update `currentValue` as CountUp animates
                    onUpdate={(val) => setCurrentValue(val)}
                    onEnd={() => setCurrentValue(targetPercentage)}
                  />
                </span>
              </div>
              <div className="progress" style={{ height: "8px" }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  // Drive width by `currentValue` which is updated by CountUp
                  style={{
                    width: `${currentValue}%`, // Use the animated value
                    transition: "width 3s ease", // CSS transition for the bar itself
                  }}
                  aria-valuenow={currentValue}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}