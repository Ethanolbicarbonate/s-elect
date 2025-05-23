// src/components/Admin/CandidateManagement/CandidateForm.js
"use client";

import { useState, useEffect } from "react";

export default function CandidateForm({
  show,
  onClose,
  onSubmit,
  initialData,
  // electionId, // Parent passes this in the submit handler
  positions,  // Already filtered by managementScope in parent
  partylists, // Already filtered by managementScope in parent
  isLoading,
  managementScope, // To help filter partylists if necessary for candidate
  userRole,
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    nickname: "",
    photoUrl: "", // TODO: Replace with file input and upload logic
    bio: "",
    platformPoints: "", // Comma-separated string
    isIndependent: false,
    positionId: "",
    partylistId: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        middleName: initialData.middleName || "",
        nickname: initialData.nickname || "",
        photoUrl: initialData.photoUrl || "",
        bio: initialData.bio || "",
        platformPoints: Array.isArray(initialData.platformPoints) ? initialData.platformPoints.join(", ") : "",
        isIndependent: initialData.isIndependent || false,
        positionId: initialData.positionId || "",
        partylistId: initialData.partylistId || "",
      });
    } else {
      setFormData({
        firstName: "", lastName: "", middleName: "", nickname: "",
        photoUrl: "", bio: "", platformPoints: "",
        isIndependent: false, positionId: "", partylistId: "",
      });
    }
    setFormError("");
  }, [initialData, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    if (!formData.positionId) {
      setFormError("Position is required.");
      return;
    }
    if (!formData.isIndependent && !formData.partylistId) {
      setFormError("Partylist is required if candidate is not independent.");
      return;
    }

    const selectedPosition = positions.find(p => p.id === formData.positionId);
    if (selectedPosition) {
        if (selectedPosition.type !== managementScope.type || 
            (selectedPosition.type === 'CSC' && selectedPosition.college !== managementScope.college)) {
            setFormError(`The selected position is outside the current management scope (${managementScope.type} ${managementScope.college || ''}).`);
            return;
        }
    } else {
        setFormError("Invalid position selected."); // Should not happen if positions prop is correct
        return;
    }


    const payload = {
      ...formData,
      platformPoints: formData.platformPoints.split(",").map(p => p.trim()).filter(p => p),
      partylistId: formData.isIndependent ? null : formData.partylistId,
    };
    onSubmit(payload);
  };

  // Filter partylists to match the scope of the selected position for this candidate
  const [compatiblePartylists, setCompatiblePartylists] = useState([]);
  useEffect(() => {
    if (formData.positionId && positions.length > 0 && partylists.length > 0) {
        const selectedPos = positions.find(p => p.id === formData.positionId);
        if (selectedPos) {
            setCompatiblePartylists(
                partylists.filter(pl => pl.type === selectedPos.type && (pl.type === 'USC' || pl.college === selectedPos.college))
            );
        } else {
            setCompatiblePartylists([]); // No position selected or found
        }
    } else if (positions.length === 0 || partylists.length === 0) {
        setCompatiblePartylists([]);
    } else { // No position selected yet, show all partylists relevant to current management scope
        setCompatiblePartylists(partylists);
    }
  }, [formData.positionId, positions, partylists]);


  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop-blur fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document"> {/* modal-xl for more space */}
          <div className="modal-content border-0 rounded-4">
            <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
              <div className="modal-header">
                <h5 className="modal-title fw-normal text-secondary">
                  {initialData ? "Edit Candidate" : "Add New Candidate"}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={isLoading}></button>
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger small">{formError}</div>}
                
                <div className="row">
                    <div className="col-md-4 mb-3">
                        <label htmlFor="cand_firstName" className="form-label fs-7 ms-1">First Name <span className="text-danger">*</span></label>
                        <input type="text" className="form-control thin-input" id="cand_firstName" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label htmlFor="cand_middleName" className="form-label fs-7 ms-1">Middle Name (Optional)</label>
                        <input type="text" className="form-control thin-input" id="cand_middleName" name="middleName" value={formData.middleName} onChange={handleChange} disabled={isLoading} />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label htmlFor="cand_lastName" className="form-label fs-7 ms-1">Last Name <span className="text-danger">*</span></label>
                        <input type="text" className="form-control thin-input" id="cand_lastName" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
                    </div>
                </div>
                <div className="mb-3">
                    <label htmlFor="cand_nickname" className="form-label fs-7 ms-1">Nickname (Optional)</label>
                    <input type="text" className="form-control thin-input" id="cand_nickname" name="nickname" value={formData.nickname} onChange={handleChange} disabled={isLoading} />
                </div>

                <div className="mb-3">
                  <label htmlFor="cand_positionId" className="form-label fs-7 ms-1">Running for Position <span className="text-danger">*</span></label>
                  <select className="form-select thin-input" id="cand_positionId" name="positionId" value={formData.positionId} onChange={handleChange} required disabled={isLoading || positions.length === 0}>
                    <option value="">-- Select Position --</option>
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name} ({pos.type}{pos.college ? ` - ${pos.college}` : ''})</option>
                    ))}
                  </select>
                  {positions.length === 0 && <div className="form-text text-warning fs-7 ms-1">No positions available for the current scope. Please add positions first.</div>}
                </div>

                <div className="form-check mb-3 ms-1">
                    <input className="form-check-input" type="checkbox" id="cand_isIndependent" name="isIndependent" checked={formData.isIndependent} onChange={handleChange} disabled={isLoading} />
                    <label className="form-check-label fs-7" htmlFor="cand_isIndependent">
                        Running as Independent Candidate
                    </label>
                </div>

                {!formData.isIndependent && (
                    <div className="mb-3">
                    <label htmlFor="cand_partylistId" className="form-label fs-7 ms-1">Affiliated Partylist <span className="text-danger">*</span></label>
                    <select className="form-select thin-input" id="cand_partylistId" name="partylistId" value={formData.partylistId} onChange={handleChange} required={!formData.isIndependent} disabled={isLoading || formData.isIndependent || compatiblePartylists.length === 0}>
                        <option value="">-- Select Partylist --</option>
                        {compatiblePartylists.map(pl => (
                        <option key={pl.id} value={pl.id}>{pl.name} ({pl.type}{pl.college ? ` - ${pl.college}` : ''})</option>
                        ))}
                    </select>
                    {compatiblePartylists.length === 0 && !formData.isIndependent && <div className="form-text text-warning fs-7 ms-1">No partylists compatible with the selected position's scope. Please add/check partylists or select a different position.</div>}
                    </div>
                )}
                
                <div className="mb-3">
                  <label htmlFor="cand_photoUrl" className="form-label fs-7 ms-1">Photo URL (Optional - 1:1 aspect ratio, max 5MB)</label>
                  <input type="text" className="form-control thin-input" id="cand_photoUrl" name="photoUrl" value={formData.photoUrl} onChange={handleChange} placeholder="https://example.com/candidate.jpg" disabled={isLoading} />
                  {/* TODO: Replace with file input and upload logic */}
                </div>
                <div className="mb-3">
                  <label htmlFor="cand_bio" className="form-label fs-7 ms-1">Short Bio/Profile (Optional)</label>
                  <textarea className="form-control thin-input" id="cand_bio" name="bio" value={formData.bio} onChange={handleChange} rows="3" disabled={isLoading}></textarea>
                </div>
                <div className="mb-3">
                  <label htmlFor="cand_platformPoints" className="form-label fs-7 ms-1">Platform Points (Optional, comma-separated)</label>
                  <textarea className="form-control thin-input" id="cand_platformPoints" name="platformPoints" value={formData.platformPoints} onChange={handleChange} rows="3" placeholder="Point 1, Point 2, Point 3" disabled={isLoading}></textarea>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light border text-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isLoading || (positions.length === 0 && !initialData) }>
                  {isLoading ? (initialData ? "Saving..." : "Creating...") : (initialData ? "Save Changes" : "Create Candidate")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}