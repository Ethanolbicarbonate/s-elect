"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useMediaQuery } from "react-responsive";

// Helper function to display notifications (can be reused in modal)
const NotificationListDisplay = ({ notifications, title }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center my-auto">
        <p className="small text-secondary opacity-50 m-0">No recent notifications</p>
      </div>
    );
  }

  return (
    <div>
      {title && <h6 className="fw-medium text-secondary mb-2">{title}</h6>}
      <ul className="list-group list-group-flush">
        {notifications.map((notif) => (
          <li
            key={notif.id}
            className="list-group-item px-0 py-2 border-bottom d-flex flex-column"
          >
            <div className="d-flex justify-content-between align-items-start mb-1">
              <span className="text-dark-emphasis fw-medium small">
                {notif.title || "Election Notification"}
              </span>
              <span className="badge fw-medium bg-light text-dark-emphasis small text-nowrap ms-2">
                {format(new Date(notif.createdAt), "MMM d, hh:mm a")}
              </span>
            </div>
            <p
              className="mb-0 small text-muted"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {notif.content}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function ElectionNotificationWidget() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false); // State for modal visibility

  // Determine if screen size is mobile (Bootstrap 'md' breakpoint is common)
  const isMobile = useMediaQuery({ maxWidth: 767 }); // Adjust breakpoint if needed

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications"); // Create this API route
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to load notifications." }));
        throw new Error(errData.error || `API Error: ${res.status}`);
      }
      const data = await res.json();
      // Sort by newest first
      setNotifications(
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || []
      );
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message || "Failed to load notifications.");
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies, fetch once on mount

  useEffect(() => {
    fetchNotifications();
    // Optional: Poll for new notifications if desired
    // const interval = setInterval(fetchNotifications, 300000); // Poll every 5 mins
    // return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Render based on screen size
  if (isMobile) {
    // --- Mobile View: Fixed Button + Modal ---
    return (
      <>
        {/* Fixed Button (appears on mobile) */}
        <button
          className="btn btn-primary btn-sm rounded-circle shadow-lg"
          style={{
            position: "fixed",
            bottom: "20px", // Adjust position as needed
            right: "20px",
            zIndex: 1050, // Above most other content, below modal
            width: "40px", // Make it a circle
            height: "40px",
            padding: 0, // Remove padding
            display: "flex", // Center icon
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowModal(true)}
          title="Show Notifications"
          disabled={isLoading} // Disable button while loading
        >
          {isLoading ? (
            <div
              className="spinner-border spinner-border-sm text-white"
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <i className="bi bi-bell fs-6"></i> // Bell icon
          )}
        </button>

        {/* Modal (appears when button is clicked) */}
        {showModal && (
          <div
            className="modal fade show modal-backdrop-blur"
            tabIndex="-1"
            style={{ display: "block" }}
            onClick={() => setShowModal(false)} // Close on backdrop click
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                {" "}
                {/* Prevent closing on content click */}
                <div className="modal-header py-2">
                  {" "}
                  {/* Smaller header */}
                  <h5 className="modal-title small fw-medium text-secondary">
                    Election Notifications
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-3">
                  {" "}
                  {/* Padded body */}
                  {error ? (
                    <div className="alert alert-danger small py-2">{error}</div>
                  ) : (
                    <NotificationListDisplay notifications={notifications} />
                  )}
                </div>
                <div className="modal-footer py-2">
                  {" "}
                  {/* Smaller footer */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- Desktop View: Card in Layout ---
  return (
    <div className="card h-100 shadow-sm flex-grow-1 d-flex flex-column rounded-4 overflow-hidden">
      <div
        className="card-header border-bottom-0 d-flex justify-content-between align-items-center bg-white"
        style={{
          backgroundImage:
            "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      >
        <h6 className="card-title text-secondary mb-0">Notifications</h6>
        <span
          className={`badge bg-warning bg-opacity-25 rounded-circle p-1 d-flex align-items-center justify-content-center`}
        >
          <i className={`bi bi-bell-fill text-warning`}></i>{" "}
        </span>
      </div>
      <div className="card-body p-3 d-flex flex-column overflow-auto">
        {" "}
        {/* Make body scrollable if content overflows */}
        {isLoading ? (
          <div className="text-center p-4 my-auto">
            <div
              className="spinner-border spinner-border-sm text-primary"
              role="status"
            ></div>
            <p className="small text-muted mt-2 mb-0">
              Loading notifications...
            </p>
          </div>
        ) : error ? (
          <div className="alert alert-danger small py-2 my-auto flex-shrink-0">
            {error}
          </div>
        ) : (
          <NotificationListDisplay notifications={notifications} />
        )}
      </div>
      {/* No footer needed for desktop card */}
    </div>
  );
}
