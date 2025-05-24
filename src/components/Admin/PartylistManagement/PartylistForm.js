// src/components/Admin/PartylistManagement/PartylistForm.js
"use client";

import { useState, useEffect, useCallback } from "react";

const CollegeEnum = {
  /* ... */ CAS: "CAS",
  CBM: "CBM",
  COC: "COC",
  COD: "COD",
  COE: "COE",
  CICT: "CICT",
  COL: "COL",
  COM: "COM",
  CON: "CON",
  PESCAR: "PESCAR",
};
const PositionTypeEnum = { USC: "USC", CSC: "CSC" };

export default function PartylistForm({
  show,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  managementScope,
  userRole,
}) {
  // ... (useState for formData, formError - initial formData setup is mostly fine) ...
  const getInitialFormData = useCallback(() => {
    // For new partylist by moderator, type/college come from managementScope
    // For new partylist by SA, type defaults, college is empty unless type is CSC
    // For editing, type/college come from initialData
    let type =
      initialData?.type || managementScope?.type || PositionTypeEnum.USC;
    let college = "";
    if (type === PositionTypeEnum.CSC) {
      college =
        initialData?.college ||
        (managementScope?.type === PositionTypeEnum.CSC
          ? managementScope.college
          : "") ||
        "";
    }

    return {
      name: initialData?.name || "",
      acronym: initialData?.acronym || "",
      logoUrl: initialData?.logoUrl || "",
      platform: initialData?.platform || "",
      type: type,
      college: college,
    };
  }, [initialData, managementScope]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setFormData(getInitialFormData());
    setFormError("");
  }, [initialData, show, managementScope, getInitialFormData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newState = { ...prev, [name]: value };
      // Only SuperAdmin can change type, which might affect college
      if (name === "type" && userRole === "SUPER_ADMIN") {
        newState.college = value === PositionTypeEnum.CSC ? prev.college : ""; // If CSC, keep current college or let SA choose; if USC, clear college.
      }
      return newState;
    });
  };

  const handleSubmit = (e) => {
    // ... (validation is mostly fine) ...
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("Partylist name is required.");
      return;
    }
    // Type is now fixed for mods, or set by SA. College depends on type.
    if (formData.type === PositionTypeEnum.CSC && !formData.college) {
      setFormError("College is required for CSC partylists.");
      return;
    }

    const payload = { ...formData };
    if (userRole === "MODERATOR") {
      // Ensure payload reflects moderator's fixed scope
      payload.type = managementScope.type;
      payload.college =
        managementScope.type === PositionTypeEnum.CSC
          ? managementScope.college
          : null;
    } else if (userRole === "SUPER_ADMIN") {
      // Ensure SA setting USC type has null college
      if (payload.type === PositionTypeEnum.USC) {
        payload.college = null;
      }
    }
    onSubmit(payload);
  };

  const isModerator = userRole === "MODERATOR";

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop-blur fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog">
        <div
          className="modal-dialog modal-lg modal-dialog-scrollable"
          role="document"
        >
          <div className="modal-content border-0 rounded-4">
            {/* REMOVED h-100 from form */}
            <form onSubmit={handleSubmit} className="d-flex flex-column">
              <div className="modal-header">
                {/* ... title ... */}
                <h5 className="modal-title fw-normal text-secondary">
                  {initialData ? "Edit Partylist" : "Create New Partylist"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                  disabled={isLoading}
                ></button>
              </div>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger small">{formError}</div>
                )}

                <div className="mb-3">
                  <label htmlFor="pl_name" className="form-label fs-7 ms-2 text-secondary">
                    Partylist Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control thin-input"
                    id="pl_name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="pl_type" className="form-label fs-7 ms-2 text-secondary">
                      Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select thin-input"
                      id="pl_type"
                      name="type"
                      value={isModerator ? managementScope.type : formData.type}
                      onChange={handleChange}
                      required
                      // --- FIX: Disable for moderators ---
                      disabled={isLoading || isModerator}
                    >
                      <option value={PositionTypeEnum.USC}>USC</option>
                      <option value={PositionTypeEnum.CSC}>CSC</option>
                    </select>
                  </div>
                  {/* Show college field if effective type is CSC */}
                  {(isModerator ? managementScope.type : formData.type) ===
                    PositionTypeEnum.CSC && (
                    <div className="col-md-6">
                      <label
                        htmlFor="pl_college"
                        className="form-label fs-7 ms-2 text-secondary"
                      >
                        College <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select thin-input"
                        id="pl_college"
                        name="college"
                        value={
                          isModerator
                            ? managementScope.college
                            : formData.college || ""
                        }
                        onChange={handleChange}
                        required
                        // --- FIX: Disable for moderators ---
                        disabled={isLoading || isModerator}
                      >
                        <option value="">-- Select College --</option>
                        {Object.entries(CollegeEnum).map(([key, value]) => (
                          <option key={key} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {/* ... Acronym, Logo URL, Platform inputs (unchanged from previous good version) ... */}
                <div className="mb-3">
                  <label htmlFor="pl_acronym" className="form-label fs-7 ms-2 text-secondary">
                    Acronym (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control thin-input"
                    id="pl_acronym"
                    name="acronym"
                    value={formData.acronym}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="pl_logoUrl" className="form-label fs-7 ms-2 text-secondary">
                    Logo URL (Optional - 1:1, max 5MB)
                  </label>
                  <input
                    type="text"
                    className="form-control thin-input"
                    id="pl_logoUrl"
                    name="logoUrl"
                    value={formData.logoUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                    disabled={isLoading}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="pl_platform" className="form-label fs-7 ms-2 text-secondary">
                    Platform/Tagline (Optional)
                  </label>
                  <textarea
                    className="form-control thin-input"
                    id="pl_platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    rows="3"
                    disabled={isLoading}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                {/* ... buttons ... */}
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
                  {isLoading
                    ? initialData
                      ? "Saving..."
                      : "Creating..."
                    : initialData
                    ? "Save Changes"
                    : "Create Partylist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
