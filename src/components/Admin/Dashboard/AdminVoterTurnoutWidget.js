// src/components/Admin/Dashboard/AdminVoterTurnoutWidget.js
"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import Link from "next/link"; // Assuming it might link to results page

// Register Chart.js components (ensure they are registered once in your app)
ChartJS.register(ArcElement, Tooltip, Legend);

export default function AdminVoterTurnoutWidget({
  electionId,
  eligibleVoters,
  votesCastInScope,
  turnoutPercentage,
  scopeType,
  college, // Will be null for USC scope
}) {
  // Handle case where data might not be available or 0 eligible voters
  if (
    eligibleVoters === undefined ||
    eligibleVoters === null ||
    isNaN(eligibleVoters) ||
    eligibleVoters <= 0
  ) {
    return (
      <div className="card h-100 shadow-sm flex-grow-1 d-flex flex-column justify-content-center align-items-center p-3 text-center text-muted">
        <i className="bi bi-people display-4 mb-3"></i>
        <p className="mb-0">
          Eligible voter data not available or zero for this scope ({scopeType}
          {college ? ` - ${college}` : ""}).
        </p>
        <Link
          href={`/admin/results?electionId=${electionId}&scopeType=${scopeType}${
            college ? `&college=${college}` : ""
          }`}
          className="btn btn-sm btn-outline-primary mt-3"
        >
          View Results Page
        </Link>
      </div>
    );
  }

  const notVoted = eligibleVoters - votesCastInScope;

  const chartData = {
    labels: ["Voted", "Did Not Vote"],
    datasets: [
      {
        data: [votesCastInScope, notVoted],
        backgroundColor: ["#0d6efd", "#adb5bd"], // Primary for voted, secondary for not voted
        borderColor: ["#fff", "#fff"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows chart to resize within its container
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 15,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `Voter Turnout: ${turnoutPercentage.toFixed(2)}%`,
        font: {
          size: 16,
          weight: "bold",
        },
        padding: {
          top: 10,
          bottom: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.raw;
            const total = context.dataset.data.reduce(
              (sum, current) => sum + current,
              0
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(2) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="card h-100 shadow-sm flex-grow-1 rounded-4 overflow-hidden">
      <div className="card-header bg-primary text-white py-2 "
          style={{
            backgroundImage:
              "radial-gradient(circle,rgba(241, 241, 241, 0.23) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        >
        <h5 className="mb-0 h6">
          Voter Turnout
        </h5>
      </div>
      <div className="card-body d-flex flex-column align-items-center justify-content-center">
        <div style={{ height: "200px", width: "100%", maxWidth: "300px" }}>
          {" "}
          {/* Constrain chart size */}
          <Doughnut data={chartData} options={chartOptions} />
        </div>
        <div className="text-center mt-3">
          <p className="mb-1 small text-muted">
            Eligible Voters:{" "}
            <span className="fw-medium text-dark">{eligibleVoters}</span>
          </p>
          <p className="mb-1 small text-muted">
            Votes Cast:{" "}
            <span className="fw-medium text-dark">{votesCastInScope}</span>
          </p>
        </div>
        <Link
          href={`/admin/results?electionId=${electionId}&scopeType=${scopeType}${
            college ? `&college=${college}` : ""
          }`}
          className="btn btn-sm btn-outline-primary mt-auto w-100" // mt-auto pushes to bottom
        >
          <i className="bi bi-bar-chart-line me-2"></i>View Full Results
        </Link>
      </div>
    </div>
  );
}
