// src/components/Admin/PositionManagement/PositionForm.js
"use client";

import { useState, useEffect, useCallback } from "react";

// Enums (ideally from a shared constants file if not already available in context)
const CollegeEnum = {
  CAS: "CAS",
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

const USC_STANDARD_POSITIONS = [
  { name: "CHAIRPERSON", order: 0 },
  { name: "VICE CHAIRPERSON", order: 1 },
  { name: "COUNCILOR", order: 2 },
];

const CSC_STANDARD_POSITIONS = [
  { name: "CHAIRPERSON", order: 0 },
  { name: "VICE CHAIRPERSON", order: 1 },
  { name: "SECRETARY", order: 2 },
  { name: "ASST SECRETARY", order: 3 },
  { name: "TREASURER", order: 4 },
  { name: "ASST TREASURER", order: 5 },
  { name: "AUDITOR", order: 6 },
  { name: "ASST AUDITOR", order: 7 },
  { name: "BUSINESS MANAGER", order: 8 },
  { name: "ASST. BUSINESS MANAGER", order: 9 },
  { name: "PUBLIC INFORMATION OFFICER", order: 10 },
  { name: "ASST. PUBLIC INFORMATION OFFICER", order: 11 },
  { name: "COLLEGE REPRESENTATIVES", order: 12 }, // Note: 'COLLEGE REPRESENTATIVES' is generic, name might need college prefix in practice (e.g., CICT Representative)
  // For this form, we'll use the generic name.
];

const CUSTOM_POSITION_VALUE = "CUSTOM_POSITION";

export default function PositionForm({
  show,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  managementScope,
  userRole,
}) {
  const getInitialFormData = useCallback(() => {
    let type = managementScope?.type || PositionTypeEnum.USC;
    let college =
      managementScope?.type === PositionTypeEnum.CSC
        ? managementScope.college
        : "";
    let name = "";
    let isCustomName = false;
    let order = 0;

    if (initialData) {
      type = initialData.type || type;
      college =
        initialData.college ||
        (type === PositionTypeEnum.CSC ? managementScope?.college : "") ||
        "";
      name = initialData.name || "";
      order = initialData.order; // Keep existing order on edit

      const standardPositions =
        type === PositionTypeEnum.USC
          ? USC_STANDARD_POSITIONS
          : CSC_STANDARD_POSITIONS;
      const isStandard = standardPositions.some(
        (p) => p.name === name && p.order === order
      );
      if (!isStandard && name) {
        isCustomName = true;
      }
    }
    return {
      name: name, // This will be the value from dropdown or custom input
      customNameInput: isCustomName ? name : "", // For the custom text input
      isCustomNameSelected: isCustomName,
      description: initialData?.description || "",
      type: type,
      college: college,
      maxVotesAllowed: initialData?.maxVotesAllowed || 1,
      minVotesRequired: initialData?.minVotesRequired || 0,
      order: order, // Will be set automatically for standard, kept for custom/edit
    };
  }, [initialData, managementScope]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setFormData(getInitialFormData());
    setFormError("");
  }, [initialData, show, managementScope, getInitialFormData]);

  const handleChange = (e) => {
    const { name, value, type: inputTypeAttr, checked } = e.target; // renamed type to inputTypeAttr
    let val = inputTypeAttr === "checkbox" ? checked : value;

    if (
      name === "maxVotesAllowed" ||
      name === "minVotesRequired" /* removed order here */
    ) {
      val = parseInt(value) || 0;
    }

    setFormData((prev) => {
      const newState = { ...prev, [name]: val };

      if (name === "type") {
        newState.college =
          val === PositionTypeEnum.CSC
            ? userRole === "MODERATOR"
              ? managementScope.college
              : ""
            : "";
        newState.name = ""; // Reset position name selection when type changes
        newState.customNameInput = "";
        newState.isCustomNameSelected = false;
        newState.order = 0; // Reset order
      }

      if (name === "name") {
        // This is the dropdown value
        if (val === CUSTOM_POSITION_VALUE) {
          newState.isCustomNameSelected = true;
          newState.customNameInput = ""; // Clear custom input field
          // For custom positions, set a high order or let admin set it if we bring back order input for custom
          newState.order =
            newState.type === PositionTypeEnum.USC
              ? USC_STANDARD_POSITIONS.length
              : CSC_STANDARD_POSITIONS.length;
        } else {
          newState.isCustomNameSelected = false;
          newState.customNameInput = ""; // Clear custom input if standard is chosen
          const standardPositions =
            newState.type === PositionTypeEnum.USC
              ? USC_STANDARD_POSITIONS
              : CSC_STANDARD_POSITIONS;
          const selectedStandardPos = standardPositions.find(
            (p) => p.name === val
          );
          if (selectedStandardPos) {
            newState.order = selectedStandardPos.order;
          }
        }
      }
      return newState;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    const finalName = formData.isCustomNameSelected
      ? formData.customNameInput.trim().toUpperCase()
      : formData.name;

    if (!finalName) {
      setFormError("Position name is required.");
      return;
    }
    // ... (other validations: CSC college, maxVotes, minVotes)
    if (formData.type === PositionTypeEnum.CSC && !formData.college) {
      setFormError("College is required for CSC positions.");
      return;
    }
    if (formData.maxVotesAllowed < 1) {
      setFormError("Max votes allowed must be at least 1.");
      return;
    }
    if (
      formData.minVotesRequired < 0 ||
      formData.minVotesRequired > formData.maxVotesAllowed
    ) {
      setFormError(
        "Min votes required must be between 0 and max votes allowed."
      );
      return;
    }

    const payload = {
      name: finalName,
      description: formData.description,
      type: formData.type,
      college: formData.type === PositionTypeEnum.USC ? null : formData.college,
      maxVotesAllowed: formData.maxVotesAllowed,
      minVotesRequired: formData.minVotesRequired,
      order: formData.order, // Order is now set based on selection or for custom
    };
    onSubmit(payload);
  };

  const isModerator = userRole === "MODERATOR";
  // For moderator, type and college are fixed from managementScope.
  // SuperAdmin can change type, which then affects available standard positions.
  const currentStandardPositions =
    (isModerator ? managementScope.type : formData.type) ===
    PositionTypeEnum.USC
      ? USC_STANDARD_POSITIONS
      : CSC_STANDARD_POSITIONS;

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
            <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
              <div className="modal-header bg-white border-bottom-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                    backgroundSize: "6px 6px",
                  }}
                >
                <h5 className="modal-title fw-normal text-secondary">
                  {initialData ? "Edit Position" : "Create New Position"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                  disabled={isLoading}
                ></button>
              </div>

              <div className="modal-body" style={{ overflowY: "auto" }}>
                {formError && (
                  <div className="alert alert-danger small">{formError}</div>
                )}

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="pos_type" className="form-label fs-7 ms-2 text-secondary">
                      Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select thin-input"
                      id="pos_type"
                      name="type"
                      value={isModerator ? managementScope.type : formData.type}
                      onChange={handleChange}
                      required
                      disabled={isLoading || isModerator}
                    >
                      <option value={PositionTypeEnum.USC}>USC</option>
                      <option value={PositionTypeEnum.CSC}>CSC</option>
                    </select>
                  </div>
                  {(isModerator ? managementScope.type : formData.type) ===
                    PositionTypeEnum.CSC && (
                    <div className="col-md-6">
                      <label
                        htmlFor="pos_college"
                        className="form-label fs-7 ms-1"
                      >
                        College (for CSC) <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select thin-input"
                        id="pos_college"
                        name="college"
                        value={
                          isModerator
                            ? managementScope.college
                            : formData.college || ""
                        }
                        onChange={handleChange}
                        required
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

                <div className="mb-3">
                  <label
                    htmlFor="pos_name_select"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Position Name <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select thin-input mb-2"
                    id="pos_name_select"
                    name="name" // This now controls the selection from dropdown
                    value={
                      formData.isCustomNameSelected
                        ? CUSTOM_POSITION_VALUE
                        : formData.name
                    }
                    onChange={handleChange}
                    required={!formData.isCustomNameSelected}
                    disabled={isLoading}
                  >
                    <option value="">-- Select Position --</option>
                    {currentStandardPositions.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value={CUSTOM_POSITION_VALUE}>
                      Custom Position...
                    </option>
                  </select>
                  {formData.isCustomNameSelected && (
                    <input
                      type="text"
                      className="form-control thin-input"
                      id="pos_customNameInput"
                      name="customNameInput"
                      placeholder="Enter Custom Position Name (e.g., Arts Rep)"
                      value={formData.customNameInput}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  )}
                </div>
                {/* Order input is removed as it's now automatic */}

                <div className="row">
                  {/* ... MaxVotesAllowed and MinVotesRequired inputs (unchanged from previous good version) ... */}
                  <div className="col-md-6">
                    {" "}
                    {/* Changed from col-md-4 */}
                    <label
                      htmlFor="pos_maxVotesAllowed"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      Max Votes Allowed <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control thin-input"
                      id="pos_maxVotesAllowed"
                      name="maxVotesAllowed"
                      value={formData.maxVotesAllowed}
                      onChange={handleChange}
                      required
                      min="1"
                      disabled={isLoading}
                    />
                    <div className="form-text fs-7 ms-1 text-secondary opacity-75 text-end">
                      Single-seat: 1 · Multi-seat: num of seats
                    </div>
                  </div>
                  <div className="col-md-6">
                    {" "}
                    {/* Changed from col-md-4 */}
                    <label
                      htmlFor="pos_minVotesRequired"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      Min Votes Required
                    </label>
                    <input
                      type="number"
                      className="form-control thin-input"
                      id="pos_minVotesRequired"
                      name="minVotesRequired"
                      value={formData.minVotesRequired}
                      onChange={handleChange}
                      min="0"
                      disabled={isLoading}
                    />
                    <div className="form-text fs-7 ms-1 text-secondary opacity-75 text-end">
                      Usually 0 (voter can skip)
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="pos_description"
                    className="form-label fs-7 ms-1 ms-2 text-secondary"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    className="form-control thin-input"
                    id="pos_description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    disabled={isLoading}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer bg-white border-top-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                    backgroundSize: "6px 6px",
                  }}
                >
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
                    : "Create Position"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
