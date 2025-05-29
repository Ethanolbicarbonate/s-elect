// src/components/Admin/Dashboard/LiveTallyWidget.js
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import Image from "next/image";
import { PositionType, College } from "@prisma/client"; // This import is fine for the fetchLiveTallyData logic

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const POLLING_INTERVAL_MS = 30000; // Poll every 30 seconds if election is ongoing

export default function LiveTallyWidget({
  electionId,
  electionStatus,
  positionsResults: initialPositionsResults,
  userRole,
  userCollege,
  generatedAt: initialGeneratedAt,
}) {
  const [livePositionsResults, setLivePositionsResults] = useState(
    initialPositionsResults || []
  );
  const [isLoadingLiveTally, setIsLoadingLiveTally] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(
    initialGeneratedAt ? new Date(initialGeneratedAt) : null
  );
  const [error, setError] = useState(null);

  const fetchLiveTallyData = useCallback(async () => {
    if (!electionId) return;

    setIsLoadingLiveTally(true);
    setError(null);

    let scopeTypeParam; // Declare without initial value
    let collegeParam = null; // Default to null

    // --- FIX START ---
    // Determine query parameters based on admin's role and desired widget scope
    if (userRole === "SUPER_ADMIN" || userRole === "AUDITOR") {
      // For Super Admin and Auditor, explicitly set scope to USC for this widget
      scopeTypeParam = PositionType.USC;
      collegeParam = null; // USC scope has no college
    } else if (userRole === "MODERATOR") {
      // Moderators see results based on their assigned scope
      scopeTypeParam = userCollege ? PositionType.CSC : PositionType.USC;
      if (userCollege) collegeParam = userCollege;
    } else {
      // Fallback for unexpected roles, should not happen given main page checks
      console.warn(
        "LiveTallyWidget: Unexpected user role, defaulting to USC scope."
      );
      scopeTypeParam = PositionType.USC;
      collegeParam = null;
    }
    // --- FIX END ---

    const queryParams = new URLSearchParams({
      electionId: electionId,
      scopeType: scopeTypeParam,
    });
    if (collegeParam) queryParams.append("college", collegeParam); // Only append if collegeParam is not null

    try {
      const res = await fetch(`/api/admin/results?${queryParams.toString()}`);
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to fetch live results." }));
        throw new Error(errorData.error || `API Error: ${res.status}`);
      }
      const data = await res.json();
      setLivePositionsResults(data.positions || []);
      setLastRefreshed(new Date(data.generatedAt));
    } catch (err) {
      console.error("Error fetching live tally:", err);
      setError(err.message || "Failed to update live tally.");
    } finally {
      setIsLoadingLiveTally(false);
    }
  }, [electionId, userRole, userCollege]);

  useEffect(() => {
    if (!initialPositionsResults || initialPositionsResults.length === 0) {
      fetchLiveTallyData();
    }
  }, [fetchLiveTallyData, initialPositionsResults]);

  useEffect(() => {
    let intervalId;
    if (electionStatus === "ONGOING") {
      intervalId = setInterval(fetchLiveTallyData, POLLING_INTERVAL_MS);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [electionStatus, fetchLiveTallyData]);

  if (!electionId) {
    return (
      <div className="card shadow-sm flex-grow-1 p-4 text-center text-muted">
        <i className="bi bi-bar-chart-line display-4 mb-3"></i>
        <h5 className="mb-0">No Election Selected</h5>
        <p className="small mb-0">Select an election to view its results.</p>
      </div>
    );
  }

  const widgetTitle =
    electionStatus === "ONGOING"
      ? "Live Vote Tally"
      : electionStatus === "ENDED"
      ? "Final Election Results"
      : "Election Results";

  const scopeDisplay =
    userRole === "SUPER_ADMIN" || userRole === "AUDITOR"
      ? `USC`
      : userCollege
      ? `CSC (${userCollege})`
      : "USC";

  // Calculate overall total votes for this scope for the simple progress bar
  const totalVotesOverall = livePositionsResults.reduce(
    (acc, pos) => acc + pos.totalVotesCastForPosition,
    0
  );

  return (
    <div className="card h-100 shadow-sm flex-grow-1 d-flex flex-column rounded-4 overflow-hidden">
      {" "}
      {/* Added flex-column here */}
      <div className="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center "
          style={{
            backgroundImage:
              "radial-gradient(circle,rgba(241, 241, 241, 0.23) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        >
        <h5 className="mb-0 h6">
          {widgetTitle} ({scopeDisplay})
        </h5>
        <button
          className="btn btn-sm btn-outline-light"
          onClick={fetchLiveTallyData}
          disabled={isLoadingLiveTally}
          title="Manual Refresh"
        >
          <i
            className={`bi bi-arrow-clockwise ${
              isLoadingLiveTally ? "spinner-animation" : ""
            }`}
          ></i>
          <span className="d-none d-sm-inline ms-1">
            {isLoadingLiveTally ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </div>
      <div className="card-body p-3 d-flex flex-column">
        {" "}
        {/* Added flex-column here */}
        {error && <div className="alert alert-danger small py-2">{error}</div>}
        {!livePositionsResults || livePositionsResults.length === 0 ? (
          <div className="text-center p-4 text-muted flex-grow-1 d-flex flex-column justify-content-center align-items-center">
            {" "}
            {/* Centered content */}
            <i className="bi bi-box-seam display-4 mb-3"></i>
            <p className="mb-0">
              No results data available for this election and scope.
            </p>
          </div>
        ) : (
          <div className="flex-grow-1 d-flex flex-column">
            {" "}
            {/* This will take remaining space and be scrollable */}
            <p className="small text-muted mb-3 text-end flex-shrink-0">
              Last Updated:{" "}
              {lastRefreshed ? format(lastRefreshed, "hh:mm:ss a") : "N/A"}
            </p>
            {/* Overall Votes Summary (Optional but good for quick overview) */}
            {totalVotesOverall > 0 && (
              <div className="mb-3 flex-shrink-0 border p-2 rounded-3">
                <h6 className="fw-medium text-secondary-emphasis fs-7 mb-1">
                  Total Votes Counted
                </h6>
                <p className="fs-4 fw-medium text-primary mb-0">
                  {totalVotesOverall.toLocaleString()}
                </p>
              </div>
            )}
            {/* Scrollable list of positions and top candidates */}
            <div
              className="flex-grow-1 overflow-auto pe-2"
              style={{ maxHeight: "calc(100vh - 400px)" }}
            >
              {" "}
              {/* Max-height just as a fallback if flex doesn't work perfectly */}
              {livePositionsResults.map((position) => (
                <div
                  key={position.id}
                  className="position-summary mb-3 p-2 border rounded-3"
                >
                  {" "}
                  {/* Smaller card for each position */}
                  <h6 className="fw-medium text-dark-emphasis mb-2 fs-7 d-flex justify-content-between align-items-center">
                    <span>{position.name}</span>
                    <span className="badge fw-medium bg-secondary-subtle text-secondary-emphasis rounded-pill">
                      {position.totalVotesCastForPosition} votes
                    </span>
                  </h6>
                  <ul className="list-group list-group-flush small">
                    {position.candidates.slice(0, 3).map((candidate) => {
                      // Only show top 3 candidates
                      const isWinner = candidate.isWinner;
                      return (
                        <li
                          key={candidate.id}
                          className="list-group-item d-flex align-items-center py-1 px-0 border-0"
                        >
                          <div
                            className="flex-shrink-0 me-2 rounded-circle"
                            style={{
                              width: "24px",
                              height: "24px",
                              overflow: "hidden",
                              position: "relative",
                              border: "1px solid #eee",
                              backgroundColor: "#f8f9fa",
                            }}
                          >
                            {candidate.photoUrl ? (
                              <Image
                                src={candidate.photoUrl}
                                alt={candidate.lastName}
                                fill
                                style={{ objectFit: "cover" }}
                                sizes="24px"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="bg-light rounded-circle d-flex align-items-center justify-content-center w-100 h-100 fs-8">
                                <i className="bi bi-person-fill text-muted"></i>
                              </div>
                            )}
                          </div>
                          <div className="flex-grow-1 text-truncate">
                            <span className="fw-medium text-dark-emphasis">
                              {candidate.firstName} {candidate.lastName}
                            </span>
                            {isWinner && (
                              <i
                                className="bi bi-award-fill text-warning ms-1"
                                title="Winner"
                              ></i>
                            )}
                          </div>
                          <div className="ms-2 fw-medium text-primary">
                            {candidate.votesReceived}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {position.candidates.length > 3 && ( // Indicate more candidates if applicable
                    <p className="text-end text-muted small mt-1 mb-0">
                      and {position.candidates.length - 3} more...
                    </p>
                  )}
                </div>
              ))}
            </div>
            {/* Link to Full Results (at the bottom) */}
            <div className="text-center mt-3 flex-shrink-0">
              <Link
                href={`/admin/results?electionId=${electionId}`}
                className="btn btn-outline-primary btn-sm"
              >
                View Full Results <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .spinner-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
