// src/app/(student)/dashboard/page.js
import Link from "next/link";

export default function DashboardPage() {
  // --- Calendar Logic ---
  const currentDate = new Date(2025, 4, 1); // May 2025 (Month is 0-indexed, so 4 is May)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const currentMonthYear = `${monthName} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate(); // Get total days in the current month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sun, 1 for Mon, ..., 6 for Sat

  // Adjust firstDayOfMonth to be 0 for Monday, 6 for Sunday, to match common calendar layouts
  // If your week starts on Sunday, this adjustment is different or not needed.
  // Assuming MON is the first day of the week in your display (['MON', 'TUE', ...])
  const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 (Mon) to 6 (Sun)

  const calendarDays = [];
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOffset; i++) {
    calendarDays.push({ type: "empty", key: `empty-${i}` });
  }
  // Add actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ type: "day", day: day, key: `day-${day}` });
  }
  // --- End Calendar Logic ---

  return (
    <div>
      {/* Row 1: Combined Status, Calendar, Live Tally */}
      <div className="row g-4 mb-4">
        {/* Combined Election & Voter Status Container */}
        <div className="col-md-6 col-lg-3 d-flex flex-column">
          {" "}
          {/* Added d-flex flex-column */}
          {/* Election Status Widget */}
          <div className="card shadow-sm border-0 mb-4 flex-grow-1">
            {" "}
            {/* Added flex-grow-1 */}
            <div className="card-body d-flex flex-column">
              {" "}
              {/* Optional: make card-body also flex if content needs to stretch */}
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="card-title text-secondary mb-0">
                  Election Status
                </h6>
                <span className="badge bg-success-soft rounded-circle p-1">
                  <i className="bi bi-check-circle-fill text-success"></i>
                </span>
              </div>
              <hr className="border-1 border-secondary opacity-20"></hr>
              <h3 className="text-success">Ongoing</h3>
              <p className="card-text text-muted small  opacity-50 mt-4">
                The election is currently being held.
              </p>
              {/* If you want content within card-body to stretch, add mt-auto to the last element or make inner elements flex-grow-1 */}
            </div>
          </div>
          {/* Voter Status Widget */}
          <div className="card shadow-sm border-0 flex-grow-1">
            {" "}
            {/* Added flex-grow-1 */}
            <div className="card-body d-flex flex-column">
              {" "}
              {/* Optional: make card-body also flex */}
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="card-title text-secondary mb-0">Voter Status</h6>
                <span className="badge bg-danger-soft rounded-circle p-1">
                  <i className="bi bi-exclamation-circle-fill text-danger"></i>
                </span>
              </div>
              <hr className="border-1 border-secondary opacity-20"></hr>
              <h3 className="text-secondary">Vote not submitted</h3>
              <p className="card-text text-muted small opacity-50 mt-4">
                You haven't submitted your vote yet.
              </p>
            </div>
          </div>
        </div>{" "}
        {/* End of Combined Status Container */}
        {/* Election Calendar Widget */}
        <div className="col-md-6 col-lg-5">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-body d-flex flex-column">
              {" "}
              {/* Added d-flex flex-column for better height management if needed */}
              <div className="d-flex justify-content-between align-items-center m-0 p-0">
                <h6 className="card-title text-secondary mb-0">
                  Election Calendar
                </h6>
                <div className="mb-0">
                  <button
                    className="btn btn-sm btn-outline-none mb-0 p-0 opacity-75"
                    aria-label="Previous month"
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-none mb-0 p-0 opacity-75"
                    aria-label="Next month"
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
              <hr className="border-1 border-secondary opacity-20"></hr>
              <h6 className="text-center mb-3 text-primary">
                {currentMonthYear}
              </h6>{" "}
              {/* currentMonthYear = "May 2025" */}
              {/* Weekday Headers */}
              <div className="row g-0 text-center small text-muted mb-2">
                {" "}
                {/* g-0 to remove gutters between weekday cols */}
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                  (day) => (
                    <div className="col fw-bold" key={day}>
                      {day}
                    </div>
                  )
                )}
              </div>
              {/* Calendar Days Grid */}
              <div
                className="d-grid gap-1"
                style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
              >
                {" "}
                {/* Using CSS Grid for days */}
                {(() => {
                  // For May 2025:
                  // 1st May 2025 is a Thursday.
                  // Monday is index 0, Tuesday 1, ..., Thursday 3, ..., Sunday 6
                  const firstDayOfMonthIndex = 3; // Thursday (0=Mon, 1=Tue, 2=Wed, 3=Thu)
                  const daysInMonth = 31; // Days in May

                  const calendarCells = [];

                  // 1. Add empty cells for days before the 1st of the month
                  for (let i = 0; i < firstDayOfMonthIndex; i++) {
                    calendarCells.push(
                      <div className="p-1" key={`empty-${i}`}>
                        <div
                          className="btn btn-sm w-100 btn-outline-light text-muted"
                          style={{ visibility: "hidden" }}
                        >
                          {" "}
                        </div>{" "}
                        {/* Invisible placeholder */}
                      </div>
                    );
                  }

                  // 2. Add cells for the actual days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    calendarCells.push(
                      <div className="p-1" key={`day-${day}`}>
                        <button
                          className={`btn btn-sm w-100 ${
                            day === 2
                              ? "btn-primary" // Example: Highlight day 2
                              : day === 1
                              ? "btn-outline-primary fw-bold" // Example: Highlight Mondays
                              : "btn-light"
                          }`}
                          title={`May ${day}, 2025`}
                        >
                          {day}
                        </button>
                      </div>
                    );
                  }

                  // 3. Optional: Add empty cells to fill the last week if needed
                  // const totalCells = firstDayOfMonthIndex + daysInMonth;
                  // const remainingCells = (7 - (totalCells % 7)) % 7; // Cells to fill the last row to 7
                  // for (let i = 0; i < remainingCells; i++) {
                  //   calendarCells.push(
                  //     <div className="p-1" key={`empty-end-${i}`}>
                  //       <div className="btn btn-sm w-100 btn-outline-light text-muted" style={{visibility: 'hidden'}}> </div>
                  //     </div>
                  //   );
                  // }

                  return calendarCells;
                })()}
              </div>
            </div>
          </div>
        </div>{" "}
        {/* End of Calendar col-lg-5 */}
        {/* Live Tally Widget (Placeholder) */}
        <div className="col-lg-4">
          {/* ... (Live Tally widget remains the same) ... */}
          <div className="card h-100 shadow-sm border-0">
            <div className="card-body">
              <h6 className="card-title text-secondary mb-0">Live Tally</h6>
              <hr className="border-1 border-secondary opacity-20"></hr>
              <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                <p>Live tally data will appear here.</p>
              </div>
            </div>
          </div>
        </div>{" "}
        {/* End of Live Tally */}
      </div>{" "}
      {/* End of Row 1 */}
      {/* Row 2: Results (Full Width) */}
      <div className="row g-4 h-100">
        {/* ... (Results widget remains the same) ... */}
        <div className="col-12 h-100">
          {" "}
          {/* This column will span the full width */}
          <div className="card h-100 shadow-sm border-0">
            {" "}
            {/* You might want to control height or min-height */}
            <div className="card-body vh-100">
              <h6 className="card-title text-secondary mb-0">Results</h6>
              <hr className="border-1 border-secondary opacity-20"></hr>
              <div
                className="d-flex align-items-center justify-content-center h-100 text-muted"
                style={{ minHeight: "150px" }}
              >
                {" "}
                {/* Example min-height */}
                <p>
                  Election results will be displayed here after the voting
                  period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>{" "}
      {/* End of Row 2 */}
    </div>
  );
}
