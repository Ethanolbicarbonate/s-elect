// src/components/Admin/ElectionManagement/CreateElectionForm.js
"use client";

import { useState } from "react";

export default function CreateElectionForm({
  isLoading,
  onSubmitCreate,
  pageError, // Use page-level error/success
  pageSuccessMessage,
  clearPageMessages, // Function to clear messages
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearPageMessages(); // Clear previous messages
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      onSubmitCreate(null, "Start date must be before end date."); // Pass error up
      return;
    }
    const success = await onSubmitCreate(formData); // onSubmitCreate should handle API call and return true/false
    if (success) {
      setFormData({ name: "", description: "", startDate: "", endDate: "" }); // Reset form on success
    }
  };

  return (
    <div className="card h-100 border-1 rounded-4">
      <div className="card-header rounded-top-4 bg-primary-soft">
        <h5 className="mb-0 text-secondary fw-normal">
          Create New Election Period
        </h5>
      </div>
      <div className="card-body">
        {/* Page-level messages will be displayed by the parent page */}
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-2">
                <label
                  htmlFor="name"
                  className="form-label fs-7 text-secondary ms-2"
                >
                  Election Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="row mb-3">
                <div className="col-md-6 mb-2">
                  <label
                    htmlFor="startDate"
                    className="form-label fs-7 text-secondary ms-2"
                  >
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="col-md-6">
                  <label
                    htmlFor="endDate"
                    className="form-label fs-7 text-secondary ms-2"
                  >
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-4">
              <div>
                <label
                  htmlFor="description"
                  className="form-label fs-7 text-secondary ms-2"
                >
                  Description (Optional)
                </label>
                <div className="card border-1 rounded pb-1">
                  <textarea
                    className="form-control border-0"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    disabled={isLoading}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12 col-md-auto ms-auto">
              <button
                type="submit"
                className="btn custom-btn fs-6 btn-lg text-secondary border rounded-2 bg-light w-100"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Election Period"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
