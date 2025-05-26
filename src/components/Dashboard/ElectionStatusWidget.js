// src/components/Dashboard/ElectionStatusWidget.js
"use client";

export default function ElectionStatusWidget({
  status = "N/A",
  message = "No election data currently available.",
  electionStartDate, // Optional: Pass if status is UPCOMING
  electionEndDate, // Optional: Pass if status is ONGOING (effective end date)
}) {
  let statusColor = "secondary"; // Default for N/A, PAUSED, ARCHIVED
  let iconName = "bi-info-circle";
  let statusText = status;
  let finalMessage = message;

  switch (
    status?.toUpperCase() // Use toUpperCase for case-insensitivity
  ) {
    case "ONGOING":
      statusColor = "success";
      iconName = "bi-play-circle-fill"; // Icon suggesting activity
      statusText = "Ongoing";
      // if (electionEndDate) {
      //   finalMessage = `${message} (Ends: ${new Date(electionEndDate).toLocaleDateString()})`;
      // }
      break;
    case "UPCOMING":
      statusColor = "info";
      iconName = "bi-alarm-fill"; // Icon suggesting future event
      statusText = "Upcoming";
      // if (electionStartDate) {
      //   finalMessage = `${message} (Starts: ${new Date(electionStartDate).toLocaleDateString()})`;
      // }
      break;
    case "ENDED":
      statusColor = "dark";
      iconName = "bi-stop-circle-fill"; // Icon suggesting completion
      statusText = "Ended";
      break;
    case "PAUSED":
      statusColor = "warning";
      iconName = "bi-pause-circle-fill";
      statusText = "Paused";
      break;
    case "ARCHIVED":
      statusColor = "secondary"; // Or a very muted color
      iconName = "bi-archive-fill";
      statusText = "Archived";
      break;
    case "N/A":
    default:
      statusColor = "secondary";
      iconName = "bi-question-circle-fill";
      statusText = "Unavailable";
      finalMessage = message || "Election status is currently unavailable.";
      break;
  }

  return (
    <div className="card h-100 border-1 rounded-4 shadow-sm overflow-hidden d-flex flex-column flex-md-row">
      <div className={`bg-${statusColor} p-1`}></div>
      <div className="card-body d-flex flex-column p-0 justify-content-evenly">
        <div
          className="card-header d-flex justify-content-between align-items-center bg-white"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "8px 8px"
          }}
        >
          <h6 className="card-title text-secondary m-0 p-0">
            Election Status
          </h6>
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
            {statusText}
          </h3>
          <p
            className="card-footer text-muted small opacity-75 text-center text-md-start m-0 py-2 px-3 bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "8px 8px"
            }}
          >
            {finalMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
