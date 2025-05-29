// src/app/admin/dashboard/loading.js
// This component will automatically be shown by Next.js while the page.js fetches data.

export default function AdminDashboardLoadingSkeleton() {
  return (
    <div className="container-fluid p-0 m-0 placeholder-glow">
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-4 d-flex">
          <div className="card h-100 rounded-4 overflow-hidden shadow-sm flex-grow-1">
            <div className="card-header bg-primary text-white py-2">
              <div className="placeholder w-50 h-100 rounded"></div>
            </div>
            <div className="card-body p-3 d-flex flex-column">
              <div className="placeholder-glow">
                <div
                  className="placeholder w-75 mb-2 rounded"
                  style={{ height: "1.5rem" }}
                ></div>
                <div
                  className="placeholder w-50 mb-3 rounded"
                  style={{ height: "1rem" }}
                ></div>
                <div
                  className="placeholder w-100 mb-3 rounded"
                  style={{ height: "3em" }}
                ></div>
                <div
                  className="placeholder w-75 rounded"
                  style={{ height: "1rem" }}
                ></div>
                <div
                  className="placeholder mt-auto w-100 rounded"
                  style={{ height: "2.5rem" }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Voter Turnout Widget Skeleton */}
        <div className="col-12 col-md-6 col-lg-4 d-flex">
          <div className="card h-100 rounded-4 overflow-hidden shadow-sm flex-grow-1">
            <div className="card-header bg-primary text-white py-2">
              <div className="placeholder w-50 h-100 rounded"></div>
            </div>
            <div className="card-body p-3 d-flex flex-column">
              <div
                className="placeholder w-75 mb-3 rounded"
                style={{ height: "1.5rem" }}
              ></div>{" "}
              {/* Total Votes */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="mb-2">
                  <div className="d-flex justify-content-between mb-1">
                    <div
                      className="placeholder w-40 rounded"
                      style={{ height: "0.8rem" }}
                    ></div>
                    <div
                      className="placeholder w-20 rounded"
                      style={{ height: "0.8rem" }}
                    ></div>
                  </div>
                  <div className="progress" style={{ height: "10px" }}>
                    <div
                      className="progress-bar placeholder w-100"
                      role="progressbar"
                    ></div>
                  </div>
                </div>
              ))}
              <div
                className="placeholder w-50 mt-auto rounded"
                style={{ height: "2.5rem" }}
              ></div>{" "}
              {/* Refresh button */}
            </div>
          </div>
        </div>

        {/* Quick Actions Widget Skeleton */}
        <div className="col-12 col-md-6 col-lg-4 d-flex">
          <div className="card h-100 rounded-4 overflow-hidden shadow-sm flex-grow-1">
            <div className="card-header bg-primary text-white py-2">
              <div className="placeholder w-50 h-100 rounded"></div>
            </div>
            <div className="card-body p-3 d-flex flex-column justify-content-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="placeholder w-75 mx-auto mb-3 rounded"
                  style={{ height: "2.5rem" }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Second row of widgets: Live Tally, Recent Activity */}
      <div className="row g-4 mb-4">
        {/* Live Tally Widget Skeleton */}
        <div className="col-12 col-xl-8 d-flex">
          <div className="card h-100 rounded-4 overflow-hidden shadow-sm flex-grow-1">
            <div className="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
              <div className="placeholder w-40 h-100 rounded"></div>
              <div
                className="placeholder rounded"
                style={{ width: "2.5rem", height: "1.5rem" }}
              ></div>
            </div>
            <div className="card-body p-3 d-flex flex-column">
              <div
                className="placeholder w-30 ms-auto mb-3 rounded"
                style={{ height: "1rem" }}
              ></div>{" "}
              {/* Last Updated */}
              <div
                className="placeholder w-50 mb-3 rounded"
                style={{ height: "2rem" }}
              ></div>{" "}
              {/* Total Votes Counted */}
              {Array.from({ length: 2 }).map(
                (
                  _,
                  i // Simulate 2 positions
                ) => (
                  <div
                    key={i}
                    className="position-summary mb-3 p-2 border rounded-3"
                  >
                    <div
                      className="placeholder w-60 mb-2 rounded"
                      style={{ height: "1rem" }}
                    ></div>
                    <ul className="list-group list-group-flush small">
                      {Array.from({ length: 3 }).map(
                        (
                          _,
                          j // Simulate 3 candidates
                        ) => (
                          <li
                            key={j}
                            className="list-group-item d-flex align-items-center py-1 px-0 border-0"
                          >
                            <div
                              className="placeholder rounded-circle flex-shrink-0 me-2"
                              style={{ width: "24px", height: "24px" }}
                            ></div>
                            <div
                              className="placeholder w-50 flex-grow-1 rounded"
                              style={{ height: "0.8rem" }}
                            ></div>
                            <div
                              className="placeholder w-10 ms-2 rounded"
                              style={{ height: "0.8rem" }}
                            ></div>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )
              )}
              <div
                className="placeholder mt-auto mx-auto w-50 rounded"
                style={{ height: "2.5rem" }}
              ></div>{" "}
              {/* View Full Results Link */}
            </div>
          </div>
        </div>

        {/* Recent Activity Widget Skeleton */}
        <div className="col-12 col-xl-4 d-flex">
          <div className="card h-100 rounded-4 overflow-hidden shadow-sm flex-grow-1">
            <div className="card-header bg-primary text-white py-2">
              <div className="placeholder w-50 h-100 rounded"></div>
            </div>
            <div className="card-body p-3 d-flex flex-column">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="d-flex align-items-center mb-3">
                  <div
                    className="placeholder rounded-circle flex-shrink-0 me-2"
                    style={{ width: "20px", height: "20px" }}
                  ></div>
                  <div className="flex-grow-1 me-2">
                    <div
                      className="placeholder w-80 mb-1 rounded"
                      style={{ height: "0.8rem" }}
                    ></div>
                    <div
                      className="placeholder w-60 rounded"
                      style={{ height: "0.6rem" }}
                    ></div>
                  </div>
                  <div
                    className="placeholder w-25 rounded"
                    style={{ height: "0.8rem" }}
                  ></div>
                </div>
              ))}
              <div
                className="placeholder mt-auto w-100 rounded"
                style={{ height: "2.5rem" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      {/* Admin Notification Manager Skeleton (Only if userRole === "SUPER_ADMIN" in actual app) */}
      {/* We render it here as a placeholder for the layout */}
      <div className="row mb-4">
        <div className="col-12 d-flex">
          <div className="card h-100 rounded-4 overflow-hidden shadow-sm flex-grow-1">
            <div className="card-header bg-primary text-white py-2">
              <div className="placeholder w-50 h-100 rounded"></div>
            </div>
            <div className="card-body p-3 d-flex flex-column">
              <div
                className="placeholder w-75 mb-3 rounded"
                style={{ height: "1.5rem" }}
              ></div>
              <div
                className="placeholder w-100 mb-3 rounded"
                style={{ height: "4rem" }}
              ></div>
              <div
                className="placeholder w-100 mt-auto rounded"
                style={{ height: "2.5rem" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
