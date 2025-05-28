export default function ElectionNotificationWidget() {
      return (
    <div className="card h-100 border-1 rounded-4 shadow-sm overflow-hidden d-flex flex-column">
      <div className="card-body d-flex flex-column p-0 justify-content-evenly">
        <div
          className="card-header border-bottom-0 d-flex justify-content-between align-items-center bg-white"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "6px 6px"
          }}
        >
          <h6 className="card-title text-secondary m-0 p-0">
            Election Notification
          </h6>
          <span
            className={`badge bg-secondary-soft rounded-circle p-1 d-flex align-items-center justify-content-center`}
          >
            <i className={`bi bi bi-bell-fill text-secondary`}></i>{" "}
          </span>
        </div>
        <div className="flex-grow-1 d-flex flex-column justify-content-center m-0 p-0">
          <h3
            className={`text-secondary h-100 fw-normal opacity-75 fs-6 text-center text-md-start py-4 m-0 px-3 `}
          >
            notification will be displayed here.
          </h3>
        </div>
      </div>
    </div>
  );
}