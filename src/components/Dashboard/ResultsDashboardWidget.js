// src/components/Dashboard/ResultsDashboardWidget.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

import OverallPartylistResultsChart from "./OverallPartylistResultsChart";
import PositionDetailedResults from "./PositionDetailedResults";
import WinnersOverview from "./WinnersOverview";

// --- ProgressBar Helper (moved out of main component) ---
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
          style={{
            width: `${validPercentage}%`,
            transition: "width 0.5s ease-out",
          }}
          aria-valuenow={validPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
    </div>
  );
};
// --- End ProgressBar Helper ---

export default function ResultsDashboardWidget({
  electionDetails,
  studentCollege,
}) {
  // --- ALL HOOKS MUST BE DECLARED AT THE VERY TOP ---
  const [resultsData, setResultsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("USC");
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);

  const fetchElectionResults = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/student/election-results?electionId=${electionDetails.id}`
      );
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to load results." }));
        throw new Error(errData.error || `Error: ${res.status}`);
      }
      const data = await res.json();
      setResultsData(data);
      setCurrentPositionIndex(0); // Reset index on new data fetch
    } catch (err) {
      console.error("ResultsDashboardWidget Error:", err);
      setError(err.message);
      setResultsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [electionDetails.id]);

  useEffect(() => {
    fetchElectionResults();
  }, [fetchElectionResults]);

  // --- Memoized values that depend on `resultsData` or other state/props ---
  // These hooks must be called unconditionally, so handle `resultsData` being null.
  const uscPositions = useMemo(() => {
    return (resultsData?.positionsResults || [])
      .filter((p) => p.type === "USC")
      .sort((a, b) => a.order - b.order);
  }, [resultsData]);

  const cscPositions = useMemo(() => {
    return (resultsData?.positionsResults || [])
      .filter((p) => p.type === "CSC" && p.college === studentCollege)
      .sort((a, b) => a.order - b.order);
  }, [resultsData, studentCollege]);

  const turnoutChartData = useMemo(() => {
    if (!resultsData?.turnout) return null;
    const overallTurnout = resultsData.turnout.overall;
    const voted = overallTurnout.voted;
    const notVoted = overallTurnout.eligible - voted;

    return {
      labels: ["Voted", "Didn't Vote"],
      datasets: [
        {
          data: [voted, notVoted],
          backgroundColor: ["#0d6efd", "#dee2e6"],
          borderWidth: 0,
        },
      ],
    };
  }, [resultsData]);

  const turnoutChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: {
          position: "start",
          align: "start",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 10,

            font: {
              family: "Outfit",
              size: 12,
            },
            color: "#495057",
          },
        },
        title: {
          display: true,
          text: `Overall Turnout: ${
            resultsData?.turnout?.overall?.percentage?.toFixed(2) || 0
          }%`,
          font: { size: 16, weight: "bold" },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              const value = context.parsed; // This is the raw number of votes for the slice
              const totalSum = context.dataset.data.reduce(
                (sum, val) => sum + val,
                0
              );
              const percentage = totalSum === 0 ? 0 : (value / totalSum) * 100;

              if (label) {
                label += ": ";
              }
              if (value !== null) {
                // Check value instead of parsed
                label += new Intl.NumberFormat("en-US").format(value);
                label += ` (${percentage.toFixed(2)}%)`;
              }
              return label;
            },
          },
        },
      },
    }),
    [resultsData]
  );

  const filteredPartylistResults = useMemo(() => {
    return (resultsData?.partylistResults || []) // Ensure resultsData is not null
      .filter((pl) =>
        activeTab === "USC"
          ? pl.type === "USC"
          : pl.type === "CSC" && pl.college === studentCollege
      )
      .sort((a, b) => (a.totalVotes > b.totalVotes ? -1 : 1));
  }, [resultsData, activeTab, studentCollege]);

  // Determine which list of positions to use based on the active tab
  const currentPositions = activeTab === "USC" ? uscPositions : cscPositions;
  // Get the currently displayed position for PositionDetailedResults
  const currentPosition = currentPositions[currentPositionIndex];

  // Handlers for position navigation (these don't use hooks directly, so placement is less strict)
  const handleNextPosition = () => {
    setCurrentPositionIndex((prev) =>
      Math.min(prev + 1, currentPositions.length - 1)
    );
  };

  const handlePrevPosition = () => {
    setCurrentPositionIndex((prev) => Math.max(prev - 1, 0));
  };

  // --- CONDITIONAL RENDERING (early returns) ---

  // Don't render if election is not ended or not provided (from parent `Dashboard` component)
  if (
    !electionDetails ||
    electionDetails.effectiveStatusForStudent !== "ENDED"
  ) {
    return (
      <div className="card shadow-sm p-4 text-center text-muted rounded-4">
        <i className="bi bi-bar-chart-fill display-4 mb-3"></i>
        <h5 className="mb-0">Election Results Coming Soon</h5>
        <p className="small mb-0">
          Results will be displayed here once the election concludes and final
          tallies are complete.
        </p>
      </div>
    );
  }

  // Show loading spinner if data is not yet available
  if (isLoading && !resultsData) {
    return (
      <div className="card shadow-sm p-4 text-center text-muted h-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading results...</span>
        </div>
        <h5 className="mt-2">Loading Election Results...</h5>
      </div>
    );
  }

  // Show error message if fetch failed
  if (error) {
    return (
      <div className="card shadow-sm p-4 text-center h-100 d-flex align-items-center justify-content-center">
        <div className="alert alert-danger mb-0">Error: {error}</div>
      </div>
    );
  }

  // If no data or essential parts missing after loading (and no error)
  if (
    !resultsData ||
    !resultsData.election ||
    !resultsData.positionsResults ||
    !resultsData.partylistResults
  ) {
    return (
      <div className="card shadow-sm p-4 text-center text-muted h-100 d-flex align-items-center justify-content-center">
        <i className="bi bi-info-circle display-4 mb-3"></i>
        <h5 className="mb-0">No Election Results Available</h5>
        <p className="small mb-0">
          Please check back later or ensure the election has concluded.
        </p>
      </div>
    );
  }

  // Destructure `election` and `turnout` from `resultsData` after it's confirmed not null
  const { election, turnout } = resultsData;

  // --- ACTUAL RENDER (JSX) ---
  return (
    <div className="card shadow-sm h-100 d-flex flex-column rounded-4 overflow-hidden pb-4">
      <div
        className="card-header bg-white border-bottom-0"
        style={{
          backgroundImage:
            "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      >
        <h3 className="fs-6 mb-0 text-secondary fw-medium mb-1">
          Election Results: {election.name}
        </h3>
        <p className="text-secondary fw-normal fs-7 border-top pt-1">
          Final results as of {new Date(election.endDate).toLocaleString()}.
        </p>
      </div>
      <div className="card-body d-flex flex-column flex-grow-1">
        <ul className="nav nav-tabs mb-4 flex-shrink-0 justify-content-evenly border-1">
          <li className="nav-item">
            <button
              className={`nav-link border-0 bg-transparent ${
                activeTab === "USC" ? "active" : "text-secondary opacity-75"
              }`}
              onClick={() => {
                setActiveTab("USC");
                setCurrentPositionIndex(0);
              }}
            >
              USC Results
            </button>
          </li>
          {(cscPositions.length > 0 ||
            (election.scopeType === "CSC" &&
              election.college === studentCollege)) && (
            <li className="nav-item">
              <button
                className={`nav-link border-0 bg-transparent ${
                  activeTab === "CSC" ? "active" : "text-secondary opacity-75"
                }`}
                onClick={() => {
                  setActiveTab("CSC");
                  setCurrentPositionIndex(0);
                }}
              >
                CSC ({studentCollege || "Your College"}) Results
              </button>
            </li>
          )}
        </ul>

        {/* --- Results Content Area --- */}
        <div className="row flex-grow-1 g-4">
          {/* Column 1: Overall Turnout & Winners Overview */}
          <div className="col-lg-5 col-md-6 d-flex flex-column">
            {/* Overall Turnout Chart (Doughnut) */}
            <div
              className="w-100 w-md-50 w-lg-33 rounded-3 mb-1 p-0"
              style={{ minHeight: "200px" }}
            >
              {turnoutChartData ? (
                <div
                  style={{
                    position: "relative",
                    height: "180px",
                    width: "100%",
                  }}
                  className="border rounded-3 p-2"
                >
                  <Doughnut
                    data={turnoutChartData}
                    options={{
                      ...turnoutChartOptions,
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              ) : (
                <p className="text-muted small text-center mt-3">
                  Turnout data unavailable.
                </p>
              )}
            </div>

            {/* Winners Overview - NEW Section */}
            <div className="flex-grow-1 d-flex flex-column border rounded-3 p-2 m-0 pt-3">
              <h4 className="fs-6 text-center text-secondary pb-1">
                Elected Officials
              </h4>
              <div
                className="overflow-y-scroll pe-2 border-top"
                style={{ maxHeight: "300px" }}
              >
                <WinnersOverview positionsResults={currentPositions} />
                {currentPositions.length === 0 && (
                  <div className="alert alert-info text-center small mt-3">
                    No elected officials to display for this tab yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Partylist Results & Navigable Positions */}
          <div className="col-lg-7 col-md-6 d-flex flex-column">
            {/* Overall Partylist Results Chart */}
            <div
              className="mb-4 flex-shrink-0 border p-3 rounded-3"
              style={{ minHeight: "150px" }}
            >
              <h4 className="fs-7 mb-3 text-secondary border-bottom pb-1">
                Partylist Standing
              </h4>
              <OverallPartylistResultsChart
                partylistResults={filteredPartylistResults}
              />
              {filteredPartylistResults.length === 0 && (
                <div className="alert alert-info text-center small mt-3">
                  No partylists to display for this tab.
                </div>
              )}
            </div>

            {/* Navigable Position Detailed Results */}
            <div className="flex-grow-1 d-flex flex-column border rounded-3 p-3">
              <h4 className="fs-7 text-secondary mb-3 text-secondary border-bottom pb-1">
                Candidate Standing
              </h4>
              {currentPositions.length > 0 ? (
                <>
                  <div className="flex-grow-1">
                    <PositionDetailedResults
                      position={currentPosition}
                      candidates={currentPosition?.candidates || []}
                    />
                  </div>
                  <div className="d-flex justify-content-between mt-3 flex-shrink-0">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={handlePrevPosition}
                      disabled={currentPositionIndex === 0 || isLoading}
                    >
                      <i className="bi bi-chevron-left me-1"></i> Previous
                    </button>
                    <span className="text-muted small align-self-center">
                      Position {currentPositionIndex + 1} of{" "}
                      {currentPositions.length}
                    </span>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleNextPosition}
                      disabled={
                        currentPositionIndex === currentPositions.length - 1 ||
                        isLoading
                      }
                    >
                      Next <i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </div>
                </>
              ) : (
                <div className="alert alert-info text-center small mt-3">
                  No positions to display for this tab.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
