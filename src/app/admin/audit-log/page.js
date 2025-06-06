"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import AuditLogTable from "@/components/Admin/AuditLog/AuditLogTable";
import Pagination from "@/components/UI/Pagination";
import { AUDIT_ACTION_TYPES } from "@/lib/auditActions";
import { AuditActorType, AuditLogStatus } from "@prisma/client";

export default function AuditLogPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 20, // matches DEFAULT_PAGE_LIMIT in API
    totalRecords: 0,
  });

  // initialFilters+
  const initialFiltersState = {
    actorType: "",
    actionType: "",
    entityType: "",
    entityId: "",
    actorEmail: "",
    dateStart: "",
    dateEnd: "",
    status: "",
  };

  const [filters, setFilters] = useState(initialFiltersState);
  const [appliedFilters, setAppliedFilters] = useState(initialFiltersState); // To trigger fetch only on apply

  const fetchLogs = useCallback(
    async (pageToFetch = 1, currentFilters) => {
      setIsLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams({
          page: pageToFetch.toString(),
          limit: pagination.limit.toString(),
        });

        // active filters to queryParams
        for (const key in currentFilters) {
          // Check if value is not empty string, null, or undefined
          if (
            currentFilters[key] !== "" &&
            currentFilters[key] !== null &&
            currentFilters[key] !== undefined
          ) {
            queryParams.append(key, currentFilters[key]);
          }
        }

        const res = await fetch(
          `/api/admin/audit-logs?${queryParams.toString()}`
        );
        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ error: "Failed to load audit logs." }));
          throw new Error(errData.error || `API Error: ${res.status}`);
        }
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            limit: 20,
            totalRecords: 0,
          }
        );
      } catch (err) {
        console.error("Error fetching audit logs page:", err);
        setError(err.message);
        setLogs([]); // Clear logs on error
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit]
  ); // fetchLogs dependency: only re-creates if limit changes

  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      (session?.user?.role === "SUPER_ADMIN" ||
        session?.user?.role === "AUDITOR")
    ) {
      // Log the fetch attempt to see what filters are being used
      console.log(
        "useEffect triggered: Fetching logs with filters:",
        appliedFilters,
        "and page:",
        pagination.currentPage
      );
      fetchLogs(pagination.currentPage, appliedFilters);
    }
  }, [
    sessionStatus,
    session,
    pagination.currentPage,
    appliedFilters,
    fetchLogs,
  ]);

  const handlePageChange = (newPage) => {
    if (
      newPage >= 1 &&
      newPage <= pagination.totalPages &&
      newPage !== pagination.currentPage
    ) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to page 1 when filters change
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFiltersState);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setAppliedFilters(initialFiltersState);
  };

  if (sessionStatus === "loading") {
    return <div className="text-center p-5">Loading session...</div>;
  }
  if (
    sessionStatus === "unauthenticated" ||
    !["SUPER_ADMIN", "AUDITOR"].includes(session?.user?.role)
  ) {
    return (
      <div className="alert alert-danger m-4 text-center">
        Access Denied. You do not have permission to view audit logs.
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 m-0">
      {error && <div className="alert alert-danger">Error: {error}</div>}

      <div className="card shadow-sm mb-4 rounded-4 overflow-hidden">
        <div className="card-body p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApplyFilters();
            }}
          >
            <div className="row g-3">
              {/* --- Column 1: Actor & Action Info --- */}
              <div className="col-lg-4 col-md-6 col-sm-12">
                {" "}
                {/* Responsive column sizing */}
                <h6 className="mb-3 fw-medium text-secondary">
                  Actor & Action
                </h6>
                <div className="mb-2">
                  <label
                    htmlFor="actorTypeFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Actor Type
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="actorTypeFilter"
                    name="actorType"
                    value={filters.actorType}
                    onChange={handleFilterChange}
                  >
                    <option value="">All</option>
                    {Object.values(AuditActorType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label
                    htmlFor="actionTypeFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Action Type
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="actionTypeFilter"
                    name="actionType"
                    value={filters.actionType}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Actions</option>
                    {Object.entries(AUDIT_ACTION_TYPES).map(([key, value]) => (
                      <option key={key} value={value}>
                        {value.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label
                    htmlFor="actorEmailFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Actor Email
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    id="actorEmailFilter"
                    name="actorEmail"
                    value={filters.actorEmail}
                    onChange={handleFilterChange}
                    placeholder="Contains..."
                  />
                </div>
              </div>
              {/* --- Column 2: Entity Info --- */}
              <div className="col-lg-4 col-md-6 col-sm-12">
                <h6 className="mb-3 fw-medium text-secondary">
                  Entity & Status
                </h6>
                <div className="mb-2">
                  <label
                    htmlFor="entityTypeFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Entity Type
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="entityTypeFilter"
                    name="entityType"
                    value={filters.entityType}
                    onChange={handleFilterChange}
                  >
                    <option value="">All</option>
                    <option value="Election">Election</option>
                    <option value="Position">Position</option>
                    <option value="Partylist">Partylist</option>
                    <option value="Candidate">Candidate</option>
                    <option value="AdminUser">Admin User</option>
                    <option value="Student">Student</option>{" "}
                    {/* Added Student */}
                    {/* Add other entity types as needed */}
                  </select>
                </div>
                <div className="mb-2">
                  <label
                    htmlFor="entityIdFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Entity ID
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    id="entityIdFilter"
                    name="entityId"
                    value={filters.entityId}
                    onChange={handleFilterChange}
                    placeholder="Exact ID"
                  />
                </div>
                <div className="mb-2">
                  <label
                    htmlFor="statusFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Status
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="statusFilter"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">All</option>
                    {Object.values(AuditLogStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* --- Column 3: Date Range --- */}
              <div className="col-lg-4 col-md-12 col-sm-12">
                <h6 className="mb-3 fw-medium text-secondary">Date Range</h6>
                <div className="mb-2">
                  <label
                    htmlFor="dateStartFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Date From
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    id="dateStartFilter"
                    name="dateStart"
                    value={filters.dateStart}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="mb-2">
                  <label
                    htmlFor="dateEndFilter"
                    className="form-label form-label-sm fs-7 text-secondary ms-2"
                  >
                    Date To
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    id="dateEndFilter"
                    name="dateEnd"
                    value={filters.dateEnd}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div
          className="card-footer border-top-0 p-3 bg-white"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        >
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-3"
              onClick={handleApplyFilters} // Trigger apply on click
              disabled={isLoading}
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-3 border-secondary-subtle"
              onClick={handleResetFilters}
              disabled={isLoading}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-0 m-0">
          <AuditLogTable logs={logs} isLoading={isLoading} />
        </div>
        {!isLoading && logs.length > 0 && pagination.totalPages > 1 && (
          <div
            className="card-footer border-top-0 bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "6px 6px",
            }}
          >
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
