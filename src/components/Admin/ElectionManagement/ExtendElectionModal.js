// src/components/Admin/ElectionManagement/ExtendElectionModal.js
"use client";

import { useState, useEffect } from "react";

const collegeEnumArray = [
  "CAS",
  "CBM",
  "COC",
  "COD",
  "COE",
  "CICT",
  "COL",
  "COM",
  "CON",
  "PESCAR",
];

export default function ExtendElectionModal({
  show,
  onClose,
  electionData, // Full election object being extended
  isLoading,
  onSubmitExtension, // Function to handle the API POST call
}) {
  const [formData, setFormData] = useState({
    extendedEndDate: "",
    selectedColleges: [],
    reason: "",
  });
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (electionData) {
      const currentExtensions = electionData.extensions || [];
      setFormData({
        electionName: electionData.name, // Store for display
        extendedEndDate: new Date().toISOString().slice(0, 16), // Default to now for new extension
        selectedColleges: currentExtensions.map((ext) => ext.college),
        reason: "", // Reset reason each time
      });
      setLocalError("");
    }
  }, [electionData]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "extendedCollegeCheckbox") {
      const collegeValue = value;
      setFormData((prev) => ({
        ...prev,
        selectedColleges: checked
          ? [...new Set([...(prev.selectedColleges || []), collegeValue])]
          : (prev.selectedColleges || []).filter((col) => col !== collegeValue),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");
    if (formData.selectedColleges.length === 0 || !formData.extendedEndDate) {
      setLocalError(
        "Please select at least one college and provide an extended end date."
      );
      return;
    }
    if (
      electionData &&
      new Date(formData.extendedEndDate) <= new Date(electionData.startDate)
    ) {
      setLocalError(
        "Extended end date must be after the election's general start date."
      );
      return;
    }
    if (
      electionData &&
      new Date(formData.extendedEndDate) <= new Date(electionData.endDate)
    ) {
      if (
        !confirm(
          "The new extended end date is NOT later than the election's general end date. Proceed anyway?"
        )
      ) {
        return;
      }
    }
    onSubmitExtension(electionData.id, formData); // Pass election ID and extension data
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
            <div className="modal-content rounded-4 border-0">
              <form
                onSubmit={handleSubmit}
                className="d-flex flex-column h-100"
              >
                <div className="modal-header">
                  <h5 className="modal-title fw-normal text-secondary">
                    Extend Election for Colleges: {formData.electionName}
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
                      htmlFor="extend_endDate_modal"
                      className="form-label fs-7 text-secondary ms-2"
                    >
                      New Extended End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      id="extend_endDate_modal"
                      name="extendedEndDate"
                      value={formData.extendedEndDate}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label d-block mb-3 fs-7 text-secondary ms-2">
                      Select Colleges to Extend For:
                    </label>
                    <div
                      className="row gx-2 gy-2"
                      style={{
                        maxHeight: "250px",
                        overflowY: "auto",
                        border: "1px solid #eee",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        marginLeft: "0.15rem",
                        marginRight: "0.05rem",
                      }}
                    >
                      {collegeEnumArray.map((col) => (
                        <div className="col-md-4 col-sm-6" key={col}>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              value={col}
                              id={`modal_extend_college_${col}`}
                              name="extendedCollegeCheckbox"
                              checked={(
                                formData.selectedColleges || []
                              ).includes(col)}
                              onChange={handleChange}
                              disabled={isLoading}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`modal_extend_college_${col}`}
                            >
                              {col}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label
                      htmlFor="extend_reason_modal"
                      className="form-label fs-7 text-secondary ms-2"
                    >
                      Reason for Extension (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      id="extend_reason_modal"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      rows="2"
                      disabled={isLoading}
                    ></textarea>
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
                    {isLoading ? "Applying..." : "Apply Extension"}
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
