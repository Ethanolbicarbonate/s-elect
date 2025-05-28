"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image"; // For image preview

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

export default function PartylistForm({
  show,
  onClose,
  onSubmit,
  initialData,
  isLoading: isSubmittingEntity,
  managementScope,
  userRole,
}) {
  const getInitialFormData = useCallback(() => {
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
      logoPublicId: initialData?.logoPublicId || null,
      platform: initialData?.platform || "",
      type: type,
      college: college,
    };
  }, [initialData, managementScope]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [formError, setFormError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(initialData?.logoUrl || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const newInitialData = getInitialFormData();
    setFormData(newInitialData);
    setLogoPreview(newInitialData.logoUrl); // Reset preview if initialData changes
    setLogoFile(null); // Reset selected file
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Client-side validation (optional but good UX)
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        setFormError("Logo file is too large. Max 5MB allowed.");
        setLogoFile(null);
        setLogoPreview(formData.logoUrl || initialData?.logoUrl || null); // Revert to original or no preview
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input
        return;
      }
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type
        )
      ) {
        setFormError(
          "Invalid file type. Please select an image (JPG, PNG, WEBP, GIF)."
        );
        setLogoFile(null);
        setLogoPreview(formData.logoUrl || initialData?.logoUrl || null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFormError(""); // Clear previous file errors
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setLogoPreview(formData.logoUrl || initialData?.logoUrl || null); // Revert if file is deselected
    }
  };

  const handleRemoveLogo = async () => {
    setFormError(""); // Clear any general form errors

    // If there's an existing publicId (meaning it's saved in Cloudinary)
    if (formData.logoPublicId) {
      setIsDeletingLogo(true);
      try {
        const res = await fetch("/api/admin/upload-image", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publicId: formData.logoPublicId }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Image deletion failed.");
        }
        // Cloudinary deletion successful, now clear local state
        setFormData((prev) => ({ ...prev, logoUrl: "", logoPublicId: null }));
        setLogoFile(null); // Clear any selected file
        setLogoPreview(null); // Clear preview
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
      } catch (deleteError) {
        console.error("Logo deletion error:", deleteError);
        setFormError(
          `Logo deletion failed: ${deleteError.message}. Please try again.`
        );
        // Don't clear local state if deletion fails, so user knows it's still linked.
      } finally {
        setIsDeletingLogo(false);
      }
    } else {
      // If no publicId, it's either a new file not yet uploaded or no image at all.
      // Just clear local state.
      setFormData((prev) => ({ ...prev, logoUrl: "", logoPublicId: null }));
      setLogoFile(null);
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
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

    let finalLogoUrl = formData.logoUrl;
    let finalLogoPublicId = formData.logoPublicId;

    if (logoFile) {
      // If a new file was selected, upload it
      setIsUploadingLogo(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", logoFile);

      try {
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          body: uploadFormData, // No 'Content-Type' header needed, browser sets it for FormData
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Logo upload failed.");
        }
        finalLogoUrl = result.url; // Get URL from Cloudinary upload
        finalLogoPublicId = result.publicId; // Store publicId from upload result
      } catch (uploadError) {
        console.error("Logo upload error:", uploadError);
        setFormError(
          `Logo upload failed: ${uploadError.message}. Please try again or skip logo.`
        );
        setIsUploadingLogo(false);
        return; // Stop form submission if upload fails
      } finally {
        setIsUploadingLogo(false);
      }
    }

    const payload = {
      ...formData,
      logoUrl: finalLogoUrl,
      logoPublicId: finalLogoPublicId,
    };
    if (payload.type === PositionTypeEnum.USC) payload.college = null;
    if (userRole === "MODERATOR") {
      payload.type = managementScope.type;
      payload.college =
        managementScope.type === PositionTypeEnum.CSC
          ? managementScope.college
          : null;
    }

    onSubmit(payload); // This is the prop function from election-entities page
  };

  const isModerator = userRole === "MODERATOR";
  const totalLoading = isSubmittingEntity || isUploadingLogo || isDeletingLogo;
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
            <form onSubmit={handleSubmit} className="d-flex flex-column">
              <div
                className="modal-header bg-white border-bottom-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
                  backgroundSize: "6px 6px",
                }}
              >
                <h5 className="modal-title fw-normal text-secondary">
                  {initialData ? "Edit Partylist" : "Create New Partylist"}
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

                <div className="mb-3">
                  <label
                    htmlFor="pl_name"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
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
                    disabled={totalLoading}
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label
                      htmlFor="pl_type"
                      className="form-label fs-7 ms-2 text-secondary"
                    >
                      Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select thin-input"
                      id="pl_type"
                      name="type"
                      value={isModerator ? managementScope.type : formData.type}
                      onChange={handleChange}
                      required
                      disabled={totalLoading || isModerator}
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
                        disabled={totalLoading || isModerator}
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
                    htmlFor="pl_acronym"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Acronym (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control thin-input"
                    id="pl_acronym"
                    name="acronym"
                    value={formData.acronym}
                    onChange={handleChange}
                    disabled={totalLoading}
                  />
                </div>

                {/* --- Logo File Input & Preview with Remove Button --- */}
                <div className="mb-3">
                  <label htmlFor="pl_logoFile" className="form-label fs-7 ms-1">
                    Partylist Logo (Optional - Max 5MB, 1:1 recommended)
                  </label>
                  <input
                    type="file"
                    className="form-control thin-input"
                    id="pl_logoFile"
                    name="logoFile"
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    disabled={totalLoading}
                    ref={fileInputRef}
                  />
                  {/* Preview and Remove button */}
                  {(logoPreview || formData.logoUrl) && ( // Show preview if a file is selected or an existing URL
                    <div
                      className="mt-2 text-center"
                      style={{ maxWidth: "150px", margin: "auto" }}
                    >
                      <p className="small text-muted mb-1">Logo Preview:</p>
                      <Image
                        src={logoPreview || formData.logoUrl} // Use logoPreview (new file) or formData.logoUrl (existing)
                        alt="Logo Preview"
                        width={100}
                        height={100}
                        style={{
                          objectFit: "contain",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm mt-2"
                        onClick={handleRemoveLogo}
                        disabled={totalLoading}
                      >
                        {isDeletingLogo ? "Removing..." : "Remove Logo"}
                      </button>
                    </div>
                  )}
                </div>
                {/* --- End Logo Section --- */}

                <div className="mb-3">
                  <label
                    htmlFor="pl_platform"
                    className="form-label fs-7 ms-2 text-secondary"
                  >
                    Platform/Tagline (Optional)
                  </label>
                  <textarea
                    className="form-control thin-input"
                    id="pl_platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    rows="3"
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
                  disabled={totalLoading}
                >
                  {isSubmittingEntity
                    ? initialData
                      ? "Saving..."
                      : "Creating..."
                    : isUploadingLogo
                    ? "Uploading Logo..."
                    : isDeletingLogo
                    ? "Removing Logo..."
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
