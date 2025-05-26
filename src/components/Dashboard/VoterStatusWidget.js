// src/components/Dashboard/VoterStatusWidget.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function VoterStatusWidget({
  electionOngoing = false,
  electionId = null,
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [hasVotedInCurrent, setHasVotedInCurrent] = useState(null); // null: loading, true, false
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only fetch vote status if there's an ongoing election, an electionId, and user is authenticated
    if (
      electionOngoing &&
      electionId &&
      sessionStatus === "authenticated" &&
      session?.user
    ) {
      setIsLoading(true);
      setError("");
      fetch(`/api/student/vote-status?electionId=${electionId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Could not fetch vote status.");
          }
          return res.json();
        })
        .then((data) => {
          setHasVotedInCurrent(data.hasVoted);
        })
        .catch((err) => {
          console.error("VoterStatusWidget Error:", err);
          setError(err.message || "Error fetching status.");
          setHasVotedInCurrent(false); // Fallback or handle error state
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!electionOngoing || !electionId) {
      // If no ongoing election or no electionId, clear specific vote status
      setHasVotedInCurrent(null);
      // If already generically voted (from session, less accurate), could use that as a fallback message
      // but this widget should ideally reflect current election vote status
    }
  }, [electionOngoing, electionId, sessionStatus, session?.user]);

  let voteStatusText = "N/A";
  let voteMessage = "No ongoing election to vote in.";
  let statusColor = "secondary";
  let iconName = "bi-info-circle";

  if (
    isLoading ||
    sessionStatus === "loading" ||
    (electionOngoing && electionId && hasVotedInCurrent === null && !error)
  ) {
    voteStatusText = "Loading...";
    voteMessage = "Checking your voting status...";
    statusColor = "info";
    iconName = "bi-hourglass-split";
  } else if (error) {
    voteStatusText = "Error";
    voteMessage = error;
    statusColor = "danger";
    iconName = "bi-exclamation-triangle-fill";
  } else if (hasVotedInCurrent === true) {
    voteStatusText = "Voted";
    voteMessage = "Your vote for the current election has been submitted.";
    statusColor = "success";
    iconName = "bi-check-circle-fill";
  } else if (electionOngoing && electionId && hasVotedInCurrent === false) {
    voteStatusText = "Not voted";
    voteMessage =
      "You haven't submitted your vote for the current election yet.";
    statusColor = "danger"; // Or 'warning'
    iconName = "bi-exclamation-circle-fill";
  }
  // If !electionOngoing, initial message "No ongoing election..." remains

  return (
    <div className="card h-100 border-1 rounded-4 shadow-sm overflow-hidden d-flex flex-column flex-md-row">
      <div className={`bg-${statusColor} p-1`}></div>

      <div className="p-0 card-body d-flex flex-column justify-content-between p-0 justify-content-evenly">
        <div
          className="card-header d-flex justify-content-between align-items-center bg-white"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        >
          <h6 className="card-title text-secondary mb-0">Vote Status</h6>
          <span
            className={`badge bg-${statusColor}-soft rounded-circle p-1 d-flex align-items-center justify-content-center`}
          >
            <i className={`bi ${iconName} text-${statusColor}`}></i>{" "}
          </span>
        </div>

        <div className="flex-grow-1 d-flex flex-column justify-content-center m-0 p-0">
          <h3
            className={`text-${statusColor} h-100 fw-normal opacity-75 display-5 text-center text-md-start py-4 m-0 px-3 `}
          >
            {voteStatusText}
          </h3>
          <p
            className="card-footer text-muted small opacity-75 text-center text-md-start m-0 py-2 px-3 bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          >
            {voteMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
