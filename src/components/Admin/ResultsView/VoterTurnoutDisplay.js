"use client";

import CountUp from "react-countup"; // Optional: for animated numbers

export default function VoterTurnoutDisplay({ turnoutData }) {
  if (!turnoutData) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-body text-center text-muted">
          Voter turnout data is not available.
        </div>
      </div>
    );
  }

  const {
    eligibleVoters = 0,
    votesCastInScope = 0,
    turnoutPercentage = 0,
  } = turnoutData;

  const progressWidth = turnoutPercentage > 0 ? `${turnoutPercentage}%` : "0%";

  return (
    <div className="card border-0 mb-4">
      <div className="card-body p-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-baseline border-bottom pb-1">
                <span className="text-secondary fw-normal">
                  Total Votes Cast:
                </span>
                <span className="h4 mb-0 text-primary fw-medium">
                  <CountUp
                    end={votesCastInScope}
                    duration={1.5}
                    separator=","
                  />
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-baseline border-bottom py-1">
                <span className="text-secondary fw-normal">
                  Eligible Voters:
                </span>
                <span className="h5 mb-0 text-muted fw-medium">
                  <CountUp end={eligibleVoters} duration={1.5} separator="," />
                </span>
              </div>
            </div>

            <div
              className="progress mt-1"
              style={{ height: "20px" }}
              role="progressbar"
              aria-label="Voter Turnout"
              aria-valuenow={turnoutPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-success fw-medium"
                style={{ width: progressWidth, fontSize: "0.85rem" }}
              >
                {turnoutPercentage > 5 ? `${turnoutPercentage}%` : ""}
              </div>
            </div>
            {turnoutPercentage <= 5 &&
              progressWidth !== "0%" && ( // Show percentage outside if bar is too small
                <div className="text-end text-success fw-medium small mt-1">
                  {turnoutPercentage}%
                </div>
              )}
          </div>
          <div className="col-md-4 text-center text-md-end mt-3 mt-md-0">
            <div className="display-4 fw-bolder text-success">
              <CountUp
                end={turnoutPercentage}
                duration={1.5}
                decimals={2}
                suffix="%"
              />
            </div>
            <div className="text-muted fw-medium">Turnout Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
