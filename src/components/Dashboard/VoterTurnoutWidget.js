// src/components/Dashboard/VoterTurnoutWidget.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react"; // To get student's college for CSC display

// Helper for progress bar
const ProgressBar = ({ percentage, label, color = "primary" }) => {
  const validPercentage = Math.max(0, Math.min(100, percentage || 0));
  return (
    <div className="mb-2">
      {label && (
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-secondary">{label}</span>
          <span className={`fw-medium text-${color}`}>
            {validPercentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="progress" style={{ height: "10px" }}>
        <div
          className={`progress-bar bg-${color}`}
          role="progressbar"
          style={{ width: `${validPercentage}%` }}
          aria-valuenow={validPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
    </div>
  );
};

export default function VoterTurnoutWidget({ electionId }) {
  const { data: session } = useSession();
  const studentCollege = session?.user?.college;

  const [turnoutData, setTurnoutData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchTurnoutData = useCallback(async () => {
    if (!electionId) {
      setTurnoutData(null); // Clear data if no electionId
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/student/election-turnout?electionId=${electionId}`
      );
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to load turnout data." }));
        throw new Error(errData.error || `Error: ${res.status}`);
      }
      const data = await res.json();
      setTurnoutData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("VoterTurnoutWidget Error:", err);
      setError(err.message);
      setTurnoutData(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    fetchTurnoutData(); // Initial fetch

    // Set up interval for refreshing data (e.g., every hour)
    // More sophisticated solutions would use SWR with refreshInterval or WebSockets
    const intervalId = setInterval(fetchTurnoutData, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [fetchTurnoutData]); // fetchTurnoutData is memoized by useCallback

  const renderContent = () => {
    if (!electionId) {
      return (
        <p className="text-muted text-center small p-3">
          No active election selected to display turnout.
        </p>
      );
    }
    if (isLoading && !turnoutData) {
      // Show loading only on initial load without data
      return (
        <div className="text-center py-3">
          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          >
            <span className="visually-hidden">Loading turnout...</span>
          </div>
          <p className="small mt-1">Loading turnout data...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="alert alert-warning small p-2 text-center">{error}</div>
      );
    }
    if (!turnoutData || !turnoutData.overallUscTurnout) {
      // Check for essential data
      return (
        <p className="text-muted text-center small p-3">
          Voter turnout data is currently unavailable.
        </p>
      );
    }

    return (
      <>
        {/* USC Turnout */}
        <div className="mb-3 border p-3 rounded-3">
          <h6 className="text-dark-emphasis fw-medium fs-7 border-bottom pb-1 mb-2">
            USC Overall Turnout
          </h6>
          <ProgressBar
            percentage={turnoutData.overallUscTurnout.percentage}
            label={`${turnoutData.overallUscTurnout.voted} / ${turnoutData.overallUscTurnout.total} students`}
            color="primary"
          />
        </div>

        <div className="mb-3 border p-3 rounded-3">
          <h6 className="text-dark-emphasis fw-medium fs-7 border-bottom pb-1 mb-2">
            USC Turnout by College
          </h6>
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              paddingRight: "5px",
            }}
          >
            {" "}
            {/* Scrollable list for colleges */}
            {turnoutData.uscTurnoutByCollege
              .sort((a, b) => b.percentage - a.percentage) // Sort by highest turnout first
              .map((collegeTurnout) => (
                <ProgressBar
                  key={collegeTurnout.college}
                  label={collegeTurnout.college}
                  percentage={collegeTurnout.percentage}
                  color="danger"
                />
              ))}
          </div>
        </div>

        {/* CSC Turnout for student's college */}
        {turnoutData.specificCscTurnout &&
          turnoutData.specificCscTurnout.college === studentCollege && (
            <div className="mt-3 p-3 border rounded-2">
              <h6 className="text-dark-emphasis fw-medium fs-7 border-bottom pb-1 mb-2">
                {studentCollege} CSC Turnout
              </h6>
              <ProgressBar
                percentage={turnoutData.specificCscTurnout.percentage}
                label={`${turnoutData.specificCscTurnout.voted} / ${turnoutData.specificCscTurnout.total} students`}
                color="success"
              />
            </div>
          )}
      </>
    );
  };

  return (
    <div className="card h-100 border-1 rounded-4 shadow-sm">
      <div className="card-body d-flex flex-column p-0">
        <div
          className="card-header d-flex justify-content-between align-items-center bg-white rounded-top-4"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        >
          <h6 className="card-title text-secondary mb-0 fw-medium">
            Voter Turnout
          </h6>
          {/* Refresh button (manual) */}
          <button
            className="btn btn-sm btn-link text-secondary p-0 badge bg-secondary-subtle rounded-circle p-1 d-flex align-items-center justify-content-center"
            onClick={fetchTurnoutData}
            disabled={isLoading}
            title="Refresh turnout data"
          >
            <i
              className={`text-black bi bi-arrow-clockwise ${isLoading ? "fa-spin" : ""}`}
            ></i>{" "}
            {/* Add spinner for refresh */}
          </button>
        </div>
        <div className="flex-grow-1 p-3">{renderContent()}</div>
        {lastRefreshed && turnoutData && (
          <div className="card-footer text-end text-muted px-3 bg-white rounded-bottom-4"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          >
            <small className="fs-8">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
