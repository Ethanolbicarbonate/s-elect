// src/components/Admin/Dashboard/AdminVoterTurnoutWidget.js

"use client";

// ADDED: 'Title' to imports and register so the title actually displays
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import Link from "next/link";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

export default function AdminVoterTurnoutWidget({
  electionId,
  eligibleVoters,
  votesCastInScope,
  turnoutPercentage,
  scopeType,
  college,
}) {
  // ... (Keep existing check for undefined/null eligibleVoters) ...
  if (
    eligibleVoters === undefined ||
    eligibleVoters === null ||
    isNaN(eligibleVoters) ||
    eligibleVoters <= 0
  ) {
    return (
      // CHANGED: text-muted -> text-body-secondary
      <div className="card h-100 shadow-sm flex-grow-1 d-flex flex-column justify-content-center align-items-center p-3 text-center text-body-secondary">
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
        backgroundColor: ["#0d6efd", "#adb5bd"],
        // CHANGED: '#fff' -> 'var(--bs-card-bg)'
        // This makes the border match the card background (white or dark grey)
        borderColor: ["var(--bs-card-bg)", "var(--bs-card-bg)"],
        borderWidth: 2, // Increased slightly for cleaner look
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 15,
          font: {
            color: "var(--bs-body-color)",
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `Voter Turnout: ${turnoutPercentage.toFixed(2)}%`,
        // ADDED: Adaptive text color
        font: {
          size: 16,
          weight: "bold",
          color: "var(--bs-body-color)",
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
      <div
        className="card-header bg-primary text-white py-2"
        style={{
          backgroundImage: "var(--bg-grid-pattern)", // CHANGED: Use your new variable
          backgroundSize: "6px 6px",
        }}
      >
        <h5 className="mb-0 h6">Voter Turnout</h5>
      </div>
      <div className="card-body d-flex flex-column align-items-center justify-content-center">
        <div style={{ height: "200px", width: "100%", maxWidth: "300px" }}>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
        <div className="text-center mt-3">
          {/* CHANGED: text-muted -> text-body-secondary, text-dark -> text-body */}
          <p className="mb-1 small text-body-secondary">
            Eligible Voters:{" "}
            <span className="fw-medium text-body">{eligibleVoters}</span>
          </p>
          <p className="mb-1 small text-body-secondary">
            Votes Cast:{" "}
            <span className="fw-medium text-body">{votesCastInScope}</span>
          </p>
        </div>
        <Link
          href={`/admin/results?electionId=${electionId}&scopeType=${scopeType}${
            college ? `&college=${college}` : ""
          }`}
          className="btn btn-sm btn-outline-primary mt-auto w-100"
        >
          <i className="bi bi-bar-chart-line me-2"></i>View Full Results
        </Link>
      </div>
    </div>
  );
}