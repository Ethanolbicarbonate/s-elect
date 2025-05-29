export default function LoadingDashboardSkeleton() {
  return (
    <div className="container p-0 m-0 placeholder-glow">
      <div className="row mb-0 mb-sm-4 g-4">
        <div className="col-md-6 col-lg-4 d-flex flex-column">
          <div className="mb-4 flex-grow-1">
            <div className="placeholder rounded-4 w-100 h-100"></div>
          </div>
          <div className="flex-grow-1">
            <div className="placeholder rounded-4 w-100 h-100"></div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4 d-flex flex-column">
          <div
            className="placeholder rounded-4 w-100 flex-grow-1"
            style={{
              minHeight: "380px",
            }}
          ></div>
        </div>

        <div className="col-lg-4 d-none d-lg-flex flex-column">
          <div
            className="placeholder rounded-4 w-100 flex-grow-1"
            style={{
              minHeight: "380px",
            }}
          ></div>
        </div>
      </div>
      <div className="row mb-4 g-4">
        <div className="col-lg-12">
          <div
            className="placeholder rounded-4 w-100"
            style={{
              height: "180px",
            }}
          ></div>
        </div>
      </div>
      <div className="row g-4">
        <div className="col-lg-12">
          <div
            className="placeholder rounded-4 w-100"
            style={{
              height: "300px",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
