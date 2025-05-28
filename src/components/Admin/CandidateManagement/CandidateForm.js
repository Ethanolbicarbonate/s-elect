"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

export default function CandidateForm({
  show,
  onClose,
  onSubmit,
  initialData,
  electionId,
  positions,
  partylists,
  isLoading: isSubmittingEntity,
  managementScope,
  userRole,
}) {
  const getInitialFormData = useCallback(() => {
    return {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      middleName: initialData?.middleName || "",
      nickname: initialData?.nickname || "",
      photoUrl: initialData?.photoUrl || "",
      photoPublicId: initialData?.photoPublicId || null,
      bio: initialData?.bio || "",
      platformPoints: Array.isArray(initialData?.platformPoints)
        ? initialData.platformPoints.join(", ")
        : initialData?.platformPoints || "", // Handle if it's already a string
      isIndependent: initialData?.isIndependent || false,
      positionId: initialData?.positionId || "",
      partylistId: initialData?.partylistId || "",
    };
  }, [initialData]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [formError, setFormError] = useState("");
  const [photoFile, setPhotoFile] = useState(null); // For the selected file object
  const [photoPreview, setPhotoPreview] = useState(
    initialData?.photoUrl || null
  ); // For the data URL preview
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const newInitialData = getInitialFormData();
    setFormData(newInitialData);
    setPhotoPreview(newInitialData.photoUrl); // Reset preview if initialData changes
    setPhotoFile(null); // Reset selected file
    setFormError("");
  }, [initialData, show, getInitialFormData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Client-side validation
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        setFormError("Photo file is too large. Max 5MB allowed.");
        setPhotoFile(null);
        setPhotoPreview(formData.photoUrl || initialData?.photoUrl || null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        // GIF might not be ideal for profile pics
        setFormError(
          "Invalid file type. Please select an image (JPG, PNG, WEBP)."
        );
        setPhotoFile(null);
        setPhotoPreview(formData.photoUrl || initialData?.photoUrl || null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFormError("");
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null);
      setPhotoPreview(formData.photoUrl || initialData?.photoUrl || null); // Revert if file is deselected
    }
  };

  const handleRemovePhoto = async () => {
    setFormError(""); // Clear any general form errors

    // If there's an existing publicId (meaning it's saved in Cloudinary)
    if (formData.photoPublicId) {
      setIsDeletingPhoto(true);
      try {
        const res = await fetch("/api/admin/upload-image", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publicId: formData.photoPublicId }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Image deletion failed.");
        }
        // Cloudinary deletion successful, now clear local state
        setFormData((prev) => ({ ...prev, photoUrl: "", photoPublicId: null }));
        setPhotoFile(null); // Clear any selected file
        setPhotoPreview(null); // Clear preview
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
      } catch (deleteError) {
        console.error("Photo deletion error:", deleteError);
        setFormError(
          `Photo deletion failed: ${deleteError.message}. Please try again.`
        );
        // Don't clear local state if deletion fails, so user knows it's still linked.
      } finally {
        setIsDeletingPhoto(false);
      }
    } else {
      // If no publicId, it's either a new file not yet uploaded or no image at all.
      // Just clear local state.
      setFormData((prev) => ({ ...prev, photoUrl: "", photoPublicId: null }));
      setPhotoFile(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
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

    const selectedPosition = positions.find(
      (p) => p.id === formData.positionId
    );
    if (selectedPosition) {
      if (
        selectedPosition.type !== managementScope.type ||
        (selectedPosition.type === "CSC" &&
          selectedPosition.college !== managementScope.college)
      ) {
        setFormError(
          `The selected position is outside the current management scope (${
            managementScope.type
          } ${managementScope.college || ""}).`
        );
        return;
      }
    } else {
      setFormError("Invalid position selected."); // Should not happen if positions prop is correct
      return;
    }

    let finalPhotoUrl = formData.photoUrl; // Use existing URL if no new file
    let finalPhotoPublicId = formData.photoPublicId;

    if (photoFile) {
      setIsUploadingPhoto(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", photoFile);

      try {
        const res = await fetch("/api/admin/upload-image", {
          // Same upload endpoint
          method: "POST",
          body: uploadFormData,
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Photo upload failed.");
        }
        finalPhotoUrl = result.url;
        finalPhotoPublicId = result.publicId;
      } catch (uploadError) {
        console.error("Photo upload error:", uploadError);
        setFormError(
          `Photo upload failed: ${uploadError.message}. Please try again or skip photo.`
        );
        setIsUploadingPhoto(false);
        return;
      } finally {
        setIsUploadingPhoto(false);
      }
    }

    const payload = {
      ...formData,
      photoUrl: finalPhotoUrl, // Use the determined photo URL
      photoPublicId: finalPhotoPublicId,
      platformPoints: formData.platformPoints
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p),
      partylistId: formData.isIndependent ? null : formData.partylistId,
      electionId: electionId, // Crucial: ensure electionId is part of the payload
    };
    // If creating new and no initialData, ensure electionId is present
    if (!initialData && !payload.electionId) {
      setFormError("Election context is missing. Cannot create candidate.");
      console.error("CandidateForm: electionId is missing for new candidate.");
      return;
    }

    onSubmit(payload); // Prop function to handle actual submission
  };

  // Filter partylists to match the scope of the selected position for this candidate
  const [compatiblePartylists, setCompatiblePartylists] = useState([]);
  useEffect(() => {
    if (formData.positionId && positions.length > 0 && partylists.length > 0) {
      const selectedPos = positions.find((p) => p.id === formData.positionId);
      if (selectedPos) {
        setCompatiblePartylists(
          partylists.filter(
            (pl) =>
              pl.type === selectedPos.type &&
              (pl.type === "USC" || pl.college === selectedPos.college)
          )
        );
        if (
          formData.partylistId &&
          !compatiblePartylists.find((pl) => pl.id === formData.partylistId)
        ) {
          // Check against the *newly set* compatiblePartylists
          const newlyCompatible = partylists.filter(
            (pl) =>
              pl.type === selectedPos.type &&
              (pl.type === "USC" || pl.college === selectedPos.college)
          );
          if (!newlyCompatible.find((pl) => pl.id === formData.partylistId)) {
            setFormData((prev) => ({ ...prev, partylistId: "" }));
          }
        }
      } else {
        setCompatiblePartylists([]); // No position selected or found
        setFormData((prev) => ({ ...prev, partylistId: "" }));
      }
    } else if (partylists.length > 0) {
      // No position selected yet, or positions list is empty
      // For moderators, filter partylists by their management scope directly
      if (userRole === "MODERATOR" && managementScope) {
        setCompatiblePartylists(
          partylists.filter(
            (pl) =>
              pl.type === managementScope.type &&
              (pl.type === "USC" || pl.college === managementScope.college)
          )
        );
      } else {
        // For Super Admin or if no scope, show all partylists (they'll be filtered by position later)
        setCompatiblePartylists(partylists);
      }
    } else {
      setCompatiblePartylists([]);
    }
  }, [
    formData.positionId,
    positions,
    partylists,
    userRole,
    managementScope,
    formData.partylistId,
  ]); // Added formData.partylistId

  const totalLoading = isSubmittingEntity || isUploadingPhoto;

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop-blur fade show"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog">
        <div
          className="modal-dialog modal-xl modal-dialog-scrollable"
          role="document"
        >
          {" "}
          {/* modal-xl for more space */}
          <div className="modal-content border-0 rounded-4">
            <form onSubmit={handleSubmit} className="d-flex flex-column h-100">
              <div
                className="modal-header bg-white border-bottom-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                  backgroundSize: "6px 6px",
                }}
              >
                <h5 className="modal-title fw-normal text-secondary">
                  {initialData ? "Edit Candidate" : "Add New Candidate"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                  disabled={totalLoading}
                ></button>
              </div>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger small">{formError}</div>
                )}

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label
                      htmlFor="cand_firstName"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      First Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control thin-input"
                      id="cand_firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      disabled={totalLoading}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label
                      htmlFor="cand_middleName"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      Middle Name (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control thin-input"
                      id="cand_middleName"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      disabled={totalLoading}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label
                      htmlFor="cand_lastName"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      Last Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control thin-input"
                      id="cand_lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      disabled={totalLoading}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="cand_nickname"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control thin-input"
                    id="cand_nickname"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    disabled={totalLoading}
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="cand_photoFile"
                    className="form-label fs-7 ms-1 text-secondary"
                  >
                    Candidate Photo{" "}
                    <span className="text-muted fs-8">
                      (Optional - Max 5MB, 1:1 recommended)
                    </span>
                  </label>
                  <input
                    type="file"
                    className="form-control thin-input"
                    id="cand_photoFile"
                    name="photoFile"
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png, image/webp"
                    disabled={totalLoading}
                    ref={fileInputRef}
                  />
                  {(photoPreview || formData.photoUrl) && ( // Show preview if a file is selected or an existing URL
                    <div
                      className="mt-2 text-center"
                      style={{ maxWidth: "150px", margin: "auto" }}
                    >
                      <p className="small text-muted mb-1">Photo Preview:</p>
                      <Image
                        src={photoPreview || formData.photoUrl} // Use photoPreview (new file) or formData.photoUrl (existing)
                        alt="Candidate Photo Preview"
                        width={120}
                        height={120}
                        style={{
                          objectFit: "cover",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm mt-2"
                        onClick={handleRemovePhoto} // Call the new handler
                        disabled={totalLoading}
                      >
                        {isDeletingPhoto ? "Removing..." : "Remove Photo"}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label
                    htmlFor="cand_positionId"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Running for Position <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select thin-input"
                    id="cand_positionId"
                    name="positionId"
                    value={formData.positionId}
                    onChange={handleChange}
                    required
                    disabled={totalLoading || positions.length === 0}
                  >
                    <option value="">-- Select Position --</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name} ({pos.type}
                        {pos.college ? ` - ${pos.college}` : ""})
                      </option>
                    ))}
                  </select>
                  {positions.length === 0 && (
                    <div className="form-text text-warning fs-7 opacity-75 text-center">
                      No positions available for the current scope. Please add
                      positions first.
                    </div>
                  )}
                </div>

                <div className="form-check mb-3 text-secondary">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="cand_isIndependent"
                    name="isIndependent"
                    checked={formData.isIndependent}
                    onChange={handleChange}
                    disabled={totalLoading}
                  />
                  <label
                    className="form-check-label fs-7"
                    htmlFor="cand_isIndependent"
                  >
                    Running as Independent Candidate
                  </label>
                </div>

                {!formData.isIndependent && (
                  <div className="mb-3">
                    <label
                      htmlFor="cand_partylistId"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      Affiliated Partylist{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select thin-input"
                      id="cand_partylistId"
                      name="partylistId"
                      value={formData.partylistId}
                      onChange={handleChange}
                      required={!formData.isIndependent}
                      disabled={
                        totalLoading ||
                        formData.isIndependent ||
                        compatiblePartylists.length === 0
                      }
                    >
                      <option value="">-- Select Partylist --</option>
                      {compatiblePartylists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} ({pl.type}
                          {pl.college ? ` - ${pl.college}` : ""})
                        </option>
                      ))}
                    </select>
                    {compatiblePartylists.length === 0 &&
                      !formData.isIndependent && (
                        <div className="form-text text-warning fs-7 ms-1 text-right opacity-75">
                          No partylists added.
                        </div>
                      )}
                  </div>
                )}

                <div className="mb-3">
                  <label
                    htmlFor="cand_bio"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Short Bio/Profile (Optional)
                  </label>
                  <textarea
                    className="form-control thin-input"
                    id="cand_bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="3"
                    disabled={totalLoading}
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="cand_platformPoints"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Platform Points (Optional, comma-separated)
                  </label>
                  <textarea
                    className="form-control thin-input"
                    id="cand_platformPoints"
                    name="platformPoints"
                    value={formData.platformPoints}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Point 1, Point 2, Point 3"
                    disabled={totalLoading}
                  ></textarea>
                </div>
              </div>
              <div
                className="modal-footer bg-white border-top-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                  backgroundSize: "6px 6px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-light border text-secondary"
                  onClick={onClose}
                  disabled={totalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    totalLoading || (positions.length === 0 && !initialData)
                  }
                >
                  {isSubmittingEntity
                    ? initialData
                      ? "Saving..."
                      : "Creating..."
                    : isUploadingPhoto
                    ? "Uploading Photo..."
                    : initialData
                    ? "Save Changes"
                    : "Create Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
