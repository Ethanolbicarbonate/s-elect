// src/components/Admin/Dashboard/AdminNotificationManager.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
// Assume you have access to session for creating/deleting (e.g., useSession from next-auth/react)
// import { useSession } from "next-auth/react"; // If you need client-side session info

export default function AdminNotificationManager() {
  // const { data: session } = useSession(); // Uncomment if needed
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newNotification, setNewNotification] = useState({
    title: "",
    content: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [isDeleting, setIsDeleting] = useState({}); // State to track deletion loading for each item

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Admins fetch from the same GET endpoint as students, but sorted/filtered as needed
      // You could create a separate /api/admin/notifications GET if needed for admin-specific data (like who created it)
      const res = await fetch("/api/notifications"); // Re-use the student-facing GET for listing
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to load notifications." }));
        throw new Error(errData.error || `API Error: ${res.status}`);
      }
      const data = await res.json();
      setNotifications(
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || []
      ); // Sort newest first
    } catch (err) {
      console.error("Error fetching notifications for admin:", err);
      setError(err.message || "Failed to load notifications.");
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNewNotificationChange = (e) => {
    const { name, value } = e.target;
    setNewNotification((prev) => ({ ...prev, [name]: value }));
  };

  // Part 3: New API Route - POST /api/admin/notifications
  const handleCreateNotification = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!newNotification.content.trim()) {
      setSubmitError("Notification content cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        // Create this API route
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNotification),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create notification.");
      }
      // Assuming the API returns the newly created notification, add it to the list
      setNotifications((prev) =>
        [result, ...prev].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
      setNewNotification({ title: "", content: "" }); // Clear form
    } catch (err) {
      console.error("Error creating notification:", err);
      setSubmitError(err.message || "Failed to create notification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part 3: New API Route - DELETE /api/admin/notifications/[notificationId]
  const handleDeleteNotification = async (notificationId) => {
    // Basic confirmation
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }
    setIsDeleting((prev) => ({ ...prev, [notificationId]: true })); // Set loading state for this item
    setError(null); // Clear general fetch error

    try {
      const res = await fetch(`/api/admin/notifications/${notificationId}`, {
        // Create this API route
        method: "DELETE",
      });
      const result = await res.json(); // API might return success message or error
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete notification.");
      }
      // Remove the deleted notification from state
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      console.error(`Error deleting notification ${notificationId}:`, err);
      setError(
        err.message || `Failed to delete notification ${notificationId}.`
      ); // Display error at top
    } finally {
      setIsDeleting((prev) => {
        const newState = { ...prev };
        delete newState[notificationId]; // Remove loading state for this item
        return newState;
      });
    }
  };

  return (
    <div className="card shadow-sm mb-4 h-100 d-flex flex-column">
      {" "}
      {/* h-100 and flex-column */}
      <div className="card-header bg-primary text-white py-2">
        <h5 className="mb-0 h6">Manage Notifications</h5>
      </div>
      <div className="card-body p-3 d-flex flex-column">
        {" "}
        {/* flex-column */}
        {/* Create New Notification Form */}
        <div className="mb-4 pb-3 border-bottom flex-shrink-0">
          <h6 className="fw-semibold text-secondary mb-2">Create New</h6>
          <form onSubmit={handleCreateNotification}>
            <div className="mb-2">
              <label
                htmlFor="new-notif-title"
                className="form-label small text-muted mb-1"
              >
                Title (Optional)
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="new-notif-title"
                name="title"
                value={newNotification.title}
                onChange={handleNewNotificationChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="mb-2">
              <label
                htmlFor="new-notif-content"
                className="form-label small text-muted mb-1"
              >
                Content <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control form-control-sm"
                id="new-notif-content"
                name="content"
                value={newNotification.content}
                onChange={handleNewNotificationChange}
                rows="3"
                required
                disabled={isSubmitting}
              ></textarea>
            </div>
            {submitError && (
              <div className="alert alert-danger small py-1">{submitError}</div>
            )}
            <div className="text-end">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish Notification"}
              </button>
            </div>
          </form>
        </div>
        {/* List of Existing Notifications */}
        <div className="flex-grow-1 overflow-auto pe-2">
          {" "}
          {/* List area fills remaining space and scrolls */}
          <h6 className="fw-semibold text-secondary mb-2">
            Existing Notifications
          </h6>
          {isLoading ? (
            <div className="text-center p-3">
              <div
                className="spinner-border spinner-border-sm text-primary"
                role="status"
              ></div>
              <p className="small text-muted mt-2 mb-0">
                Loading notifications...
              </p>
            </div>
          ) : error ? (
            <div className="alert alert-danger small py-2">{error}</div> // Use general error for fetch
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted small p-3">
              No notifications have been published yet.
            </div>
          ) : (
            <ul className="list-group list-group-flush">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className="list-group-item d-flex align-items-start px-0 py-2 border-bottom"
                >
                  <div className="flex-grow-1 me-2">
                    <strong className="text-dark-emphasis small">
                      {notif.title || "Notification"}
                    </strong>
                    <p
                      className="mb-0 small text-muted"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {notif.content}
                    </p>
                    <span className="text-muted fs-8">
                      {format(
                        new Date(notif.createdAt),
                        "MMM dd, yyyy hh:mm a"
                      )}
                    </span>
                  </div>
                  <div className="flex-shrink-0 ms-auto">
                    <button
                      className="btn btn-outline-danger btn-sm py-0 px-1"
                      onClick={() => handleDeleteNotification(notif.id)}
                      disabled={isDeleting[notif.id]} // Disable button while deleting this item
                    >
                      {isDeleting[notif.id] ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          aria-hidden="true"
                        ></span>
                      ) : (
                        <i className="bi bi-trash"></i>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
