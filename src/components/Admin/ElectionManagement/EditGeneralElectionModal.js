// src/components/Admin/ElectionManagement/EditGeneralElectionModal.js
"use client";

import { useState, useEffect } from "react";

const electionStatusEnum = [
  "UPCOMING",
  "ONGOING",
  "PAUSED",
  "ENDED",
  "ARCHIVED",
];

export default function EditGeneralElectionModal({
  show,
  onClose,
  electionData, // This should be the full election object being edited
  isLoading,
  onSubmitUpdate, // Function to handle the API PUT call
}) {
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
  });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (electionData) {
      setFormData({
        id: electionData.id,
        name: electionData.name,
        description: electionData.description || "",
        startDate: new Date(electionData.startDate).toISOString().slice(0, 16),
        endDate: new Date(electionData.endDate).toISOString().slice(0, 16),
        status: electionData.status,
      });
      setLocalError(""); // Clear previous errors when new data is loaded
    }
  }, [electionData]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(""); // Clear local error
    // Validation
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setLocalError("Start date must be before end date.");
      return;
    }
    if (
      electionData &&
      (electionData.status === "ENDED" || electionData.status === "ARCHIVED") &&
      new Date(formData.endDate) > new Date() &&
      formData.status !== "ONGOING" &&
      formData.status !== "UPCOMING"
    ) {
      setLocalError(
        "To extend an ended/archived election, its status must also be set to ONGOING or UPCOMING."
      );
      return;
    }
    onSubmitUpdate(formData.id, formData); // Pass ID and full form data
  };

  return (
    <>
      {show && <div className="modal-backdrop-blur fade show"></div>}

      {/* Modal Dialog (only render if show is true) */}
      {show && (
        <div
          className="modal fade show d-block" // `d-block` makes it visible when `show` is true
          tabIndex="-1"
          role="dialog"
          aria-modal="true" // For accessibility
          aria-labelledby="extendElectionModalTitle" // For accessibility
        >
          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            role="document"
          >
            <div className="modal-content border-0 rounded-4">
              <form
                onSubmit={handleSubmit}
                className="d-flex flex-column h-100"
              >
                <div className="modal-header">
                  <h5 className="modal-title fw-normal text-secondary">
                    Edit Election: {formData.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={onClose}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body" style={{ overflowY: "auto" }}>
                  {localError && (
                    <div className="alert alert-danger small">{localError}</div>
                  )}
                  <div className="mb-3">
                    <label
                      htmlFor="edit_name"
                      className="form-label fs-7 text-secondary ms-2"
                    >
                      Election Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="edit_name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="edit_description"
                      className="form-label fs-7 text-secondary ms-2"
                    >
                      Description (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      id="edit_description"
                      name="description"
                      rows="3"
                      value={formData.description}
                      onChange={handleChange}
                      disabled={isLoading}
                    ></textarea>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label
                        htmlFor="edit_startDate"
                        className="form-label fs-7 text-secondary ms-2"
                      >
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        id="edit_startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label
                        htmlFor="edit_endDate"
                        className="form-label fs-7 text-secondary ms-2"
                      >
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        id="edit_endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="edit_status"
                      className="form-label fs-7 text-secondary ms-2"
                    >
                      Status
                    </label>
                    <select
                      className="form-select mb-4"
                      id="edit_status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      disabled={isLoading}
                    >
                      {electionStatusEnum.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="form-text text-muted px-1">
                      Changing status of an ended election to ONGOING/UPCOMING
                      will re-open it.
                    </div>
                  </div>
                </div>
                <div className="modal-footer" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-light border text-secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
