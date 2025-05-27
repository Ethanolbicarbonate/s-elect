// src/app/admin/election-entities/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  useSearchParams,
  useRouter, // Using useRouter to potentially update URL for better state sharing/bookmarking if desired
} from "next/navigation";

// Import Child Components (will be created later)
import AdminPositionList from "@/components/Admin/PositionManagement/AdminPositionList";
import PositionForm from "@/components/Admin/PositionManagement/PositionForm";
import AdminPartylistList from "@/components/Admin/PartylistManagement/AdminPartylistList";
import PartylistForm from "@/components/Admin/PartylistManagement/PartylistForm";
import AdminCandidateList from "@/components/Admin/CandidateManagement/AdminCandidateList";
import CandidateForm from "@/components/Admin/CandidateManagement/CandidateForm";

// Enums (ideally from a shared constants file)
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

export default function ElectionEntitiesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Overall Page State
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [isLoadingElections, setIsLoadingElections] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccessMessage, setPageSuccessMessage] = useState("");

  // Scope Management State (Primarily for SuperAdmin)
  // For Moderators, this is derived from their session and nav link params
  const [managementScope, setManagementScope] = useState({
    type: null,
    college: null,
  }); // e.g., { type: 'USC', college: null } or { type: 'CSC', college: 'CICT' }

  // Active Tab
  const [activeTab, setActiveTab] = useState("positions"); // 'positions', 'partylists', 'candidates'

  // Positions State
  const [positions, setPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]); // Positions filtered by managementScope
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  // Partylists State
  const [partylists, setPartylists] = useState([]);
  const [filteredPartylists, setFilteredPartylists] = useState([]); // Partylists filtered by managementScope
  const [isLoadingPartylists, setIsLoadingPartylists] = useState(false);
  const [showPartylistModal, setShowPartylistModal] = useState(false);
  const [editingPartylist, setEditingPartylist] = useState(null);

  // Candidates State
  const [candidates, setCandidates] = useState([]); // All candidates for selected election
  const [filteredCandidates, setFilteredCandidates] = useState([]); // Candidates filtered by managementScope and other filters
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candidateListFilters, setCandidateListFilters] = useState({
    positionId: "",
    partylistId: "",
  });

  // --- UTILITY FUNCTIONS ---
  const clearPageMessages = useCallback(() => {
    setPageError("");
    setPageSuccessMessage("");
  }, []);

  const displayPageMessage = useCallback(
    (message, isSuccess = true, duration = 5000) => {
      clearPageMessages();
      if (isSuccess) setPageSuccessMessage(message);
      else setPageError(message);
      if (duration) setTimeout(clearPageMessages, duration);
    },
    [clearPageMessages]
  );

  // --- DATA FETCHING ---
  const fetchElections = useCallback(async () => {
    setIsLoadingElections(true);
    clearPageMessages();
    try {
      const res = await fetch("/api/admin/elections");
      if (!res.ok)
        throw new Error(
          (await res.json()).error || "Failed to fetch elections"
        );
      const data = await res.json();
      setElections(data || []);
      if (data?.length > 0 && !selectedElectionId) {
        setSelectedElectionId(data[0].id);
      } else if (data?.length === 0) {
        displayPageMessage(
          "No elections found. Please create an election period first in Election Settings.",
          false,
          null
        );
      }
    } catch (err) {
      displayPageMessage(err.message, false);
    } finally {
      setIsLoadingElections(false);
    }
  }, [displayPageMessage, selectedElectionId, clearPageMessages]);

  // Determine management scope from session and URL params (from NavLink)
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      const urlScope = searchParams.get("scope"); // 'usc' or 'csc'
      const urlCollege = searchParams.get("college"); // college code if scope is 'csc'

      if (session.user.role === "SUPER_ADMIN") {
        // Super Admin can choose. Default to USC or first available if not set by URL
        setManagementScope((prev) => ({
          type: urlScope?.toUpperCase() || prev.type || PositionTypeEnum.USC,
          college:
            urlScope?.toUpperCase() === "CSC"
              ? urlCollege || prev.college || null
              : null,
        }));
      } else if (session.user.role === "MODERATOR") {
        if (session.user.college) {
          // College Moderator
          setManagementScope({
            type: PositionTypeEnum.CSC,
            college: session.user.college,
          });
        } else {
          // USC Moderator
          setManagementScope({ type: PositionTypeEnum.USC, college: null });
        }
      }
    }
  }, [sessionStatus, fetchElections]);

  // Fetch all entities for the selected election
  const fetchEntitiesForElection = useCallback(async () => {
    if (!selectedElectionId || !managementScope.type) return;

    const fetchAll = async (entityName, setter, loadingSetter, apiPath) => {
      loadingSetter(true);
      try {
        const res = await fetch(
          `/api/admin/elections/${selectedElectionId}/${apiPath}`
        );
        if (!res.ok)
          throw new Error(
            (await res.json()).error || `Failed to fetch ${entityName}`
          );
        const data = await res.json();
        setter(data || []);
      } catch (err) {
        displayPageMessage(
          `Error fetching ${entityName}: ${err.message}`,
          false
        );
        setter([]);
      } finally {
        loadingSetter(false);
      }
    };

    fetchAll("positions", setPositions, setIsLoadingPositions, "positions");
    fetchAll("partylists", setPartylists, setIsLoadingPartylists, "partylists");

    // Candidates are fetched slightly differently, potentially with more filters from candidateListFilters
    setIsLoadingCandidates(true);
    try {
      // Base query for candidates in the election. Further filtering for display will use managementScope.
      const res = await fetch(
        `/api/admin/candidates?electionId=${selectedElectionId}`
      );
      if (!res.ok)
        throw new Error(
          (await res.json()).error || "Failed to fetch candidates"
        );
      const data = await res.json();
      setCandidates(data || []);
    } catch (err) {
      displayPageMessage(`Error fetching candidates: ${err.message}`, false);
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [selectedElectionId, displayPageMessage, managementScope.type]); // Re-fetch if managementScope.type changes, as that defines context

  useEffect(() => {
    if (sessionStatus === "authenticated") fetchElections();
  }, [fetchElections, sessionStatus]);

  useEffect(() => {
    fetchEntitiesForElection();
  }, [fetchEntitiesForElection]); // Relies on selectedElectionId and managementScope.type from its own dependencies

  // Filter entities based on managementScope
  useEffect(() => {
    if (!managementScope.type) {
      setFilteredPositions([]); // Clear if no scope
      setFilteredPartylists([]);
      setFilteredCandidates([]);
      return;
    }

    const newFilteredPositions = positions.filter(
      (p) =>
        p.type === managementScope.type &&
        (p.type === PositionTypeEnum.USC ||
          p.college === managementScope.college)
    );
    setFilteredPositions(newFilteredPositions);

    const newFilteredPartylists = partylists.filter(
      (pl) =>
        pl.type === managementScope.type &&
        (pl.type === PositionTypeEnum.USC ||
          pl.college === managementScope.college)
    );
    setFilteredPartylists(newFilteredPartylists);
    console.log("[election-entities] managementScope:", managementScope);
    console.log("[election-entities] Original partylists:", partylists);
    console.log(
      "[election-entities] newFilteredPartylists:",
      newFilteredPartylists
    );

    let tempFilteredCandidates = candidates.filter(
      (c) =>
        c.position?.type === managementScope.type &&
        (c.position?.type === PositionTypeEnum.USC ||
          c.position?.college === managementScope.college)
    );
    if (candidateListFilters.positionId) {
      tempFilteredCandidates = tempFilteredCandidates.filter(
        (c) => c.positionId === candidateListFilters.positionId
      );
    }
    if (candidateListFilters.partylistId) {
      // Handle 'independent' as a special case if partylistId filter can signify that
      if (candidateListFilters.partylistId === "INDEPENDENT") {
        tempFilteredCandidates = tempFilteredCandidates.filter(
          (c) => c.isIndependent || !c.partylistId
        );
      } else {
        tempFilteredCandidates = tempFilteredCandidates.filter(
          (c) => c.partylistId === candidateListFilters.partylistId
        );
      }
    }
    setFilteredCandidates(tempFilteredCandidates);
  }, [
    managementScope,
    positions,
    partylists,
    candidates,
    candidateListFilters,
  ]);

  // --- CRUD HANDLERS ---
  const makeApiCall = useCallback(
    async (url, method, body, successMessage, entityNameToRefetch) => {
      clearPageMessages();
      // Determine main loading state for the active tab
      let generalLoadingSetter = setIsLoadingPositions; // Default or pick based on activeTab
      if (activeTab === "partylists")
        generalLoadingSetter = setIsLoadingPartylists;
      if (activeTab === "candidates")
        generalLoadingSetter = setIsLoadingCandidates;

      generalLoadingSetter(true);

      try {
        const options = {
          method,
          headers: { "Content-Type": "application/json" },
        };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(url, options);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({
            error: "Operation failed with status: " + res.statusText,
          }));
          throw new Error(errorData.error || "An unknown error occurred");
        }
        if (res.status !== 204) await res.json(); // Consume body if any
        displayPageMessage(successMessage, true);
        fetchEntitiesForElection(); // Refetch all, could optimize to refetch only 'entityNameToRefetch'
        return true;
      } catch (err) {
        displayPageMessage(err.message, false);
        return false;
      } finally {
        generalLoadingSetter(false);
      }
    },
    [clearPageMessages, displayPageMessage, fetchEntitiesForElection, activeTab]
  );

  // Position CRUD
  const handleSubmitPosition = async (formData) => {
    let success = false;
    const payload = { ...formData, electionId: selectedElectionId };
    // For moderators, type and college are fixed by managementScope
    if (session.user.role === "MODERATOR") {
      payload.type = managementScope.type;
      payload.college = managementScope.college; // will be null for USC Mod
    }

    if (editingPosition) {
      success = await makeApiCall(
        `/api/admin/elections/${selectedElectionId}/positions/${editingPosition.id}`,
        "PUT",
        payload,
        "Position updated successfully!"
      );
    } else {
      success = await makeApiCall(
        `/api/admin/elections/${selectedElectionId}/positions`,
        "POST",
        payload,
        "Position created successfully!"
      );
    }
    if (success) setShowPositionModal(false);
  };
  const handleDeletePosition = async (positionId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this position? This cannot be undone."
      )
    ) {
      await makeApiCall(
        `/api/admin/elections/${selectedElectionId}/positions/${positionId}`,
        "DELETE",
        null,
        "Position deleted successfully!"
      );
    }
  };

  // Partylist CRUD
  const handleSubmitPartylist = async (formData) => {
    let success = false;
    const payload = { ...formData, electionId: selectedElectionId };
    if (session.user.role === "MODERATOR") {
      payload.type = managementScope.type;
      payload.college = managementScope.college;
    }
    if (editingPartylist) {
      success = await makeApiCall(
        `/api/admin/elections/${selectedElectionId}/partylists/${editingPartylist.id}`,
        "PUT",
        payload,
        "Partylist updated successfully!"
      );
    } else {
      success = await makeApiCall(
        `/api/admin/elections/${selectedElectionId}/partylists`,
        "POST",
        payload,
        "Partylist created successfully!"
      );
    }
    if (success) setShowPartylistModal(false);
  };
  const handleDeletePartylist = async (partylistId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this partylist? This cannot be undone."
      )
    ) {
      await makeApiCall(
        `/api/admin/elections/${selectedElectionId}/partylists/${partylistId}`,
        "DELETE",
        null,
        "Partylist deleted successfully!"
      );
    }
  };

  // Candidate CRUD
  const handleSubmitCandidate = async (formData) => {
    let success = false;
    const payload = { ...formData, electionId: selectedElectionId };
    // PositionId in payload already defines the scope for candidate implicitly
    if (editingCandidate) {
      success = await makeApiCall(
        `/api/admin/candidates/${editingCandidate.id}`,
        "PUT",
        payload,
        "Candidate updated successfully!"
      );
    } else {
      success = await makeApiCall(
        `/api/admin/candidates`,
        "POST",
        payload,
        "Candidate created successfully!"
      );
    }
    if (success) setShowCandidateModal(false);
  };
  const handleDeleteCandidate = async (candidateId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this candidate? This cannot be undone."
      )
    ) {
      await makeApiCall(
        `/api/admin/candidates/${candidateId}`,
        "DELETE",
        null,
        "Candidate deleted successfully!"
      );
    }
  };

  // --- RENDER LOGIC ---
  if (sessionStatus === "loading")
    return <p className="p-4">Loading session...</p>;
  if (sessionStatus === "unauthenticated")
    return <p className="p-4 text-danger">Access Denied. Please log in.</p>;
  if (
    !session?.user ||
    !["SUPER_ADMIN", "MODERATOR"].includes(session.user.role)
  ) {
    return (
      <p className="p-4 text-danger">Access Denied. Insufficient privileges.</p>
    );
  }

  const selectedElection = elections.find((e) => e.id === selectedElectionId);
  const canManageCurrentScope = () => {
    if (!session?.user) return false;
    if (session.user.role === "SUPER_ADMIN") return true;
    if (session.user.role === "MODERATOR") {
      if (managementScope.type === PositionTypeEnum.USC)
        return session.user.college === null;
      if (managementScope.type === PositionTypeEnum.CSC)
        return session.user.college === managementScope.college;
    }
    return false;
  };

  const isLoadingCurrentTab =
    (activeTab === "positions" &&
      isLoadingPositions &&
      positions.length === 0) ||
    (activeTab === "partylists" &&
      isLoadingPartylists &&
      partylists.length === 0) ||
    (activeTab === "candidates" &&
      isLoadingCandidates &&
      candidates.length === 0);

  return (
    <div
      className="container-fluid p-0 m-0 d-flex flex-column"
      style={{ minHeight: "86vh" }}
    >
      {pageError && <div className="alert alert-danger m-3">{pageError}</div>}
      {pageSuccessMessage && (
        <div className="alert alert-success m-3">{pageSuccessMessage}</div>
      )}

      {/* Election Selector */}
      <div className="p-3 bg-white rounded-4 border shadow-sm">
        <div className="mb-3">
          <label
            htmlFor="electionSelect"
            className="form-label fs-7 text-secondary ms-2"
          >
            Select Election Period
          </label>
          <select
            id="electionSelect"
            className="form-select form-select-md"
            value={selectedElectionId}
            onChange={(e) => {
              setSelectedElectionId(e.target.value);
              // Reset dependent states if needed, or let useEffect handle it
              setPositions([]);
              setPartylists([]);
              setCandidates([]);
            }}
            disabled={isLoadingElections || elections.length === 0}
          >
            <option value="">
              {isLoadingElections
                ? "Loading elections..."
                : elections.length === 0
                ? "No elections available"
                : "-- Select an Election --"}
            </option>
            {elections.map((el) => (
              <option key={el.id} value={el.id}>
                {el.name} ({el.status})
              </option>
            ))}
          </select>
        </div>

        {/* Scope Selection for SuperAdmin */}
        {session.user.role === "SUPER_ADMIN" && selectedElectionId && (
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label
                htmlFor="scopeTypeSelect"
                className="form-label fs-7 text-secondary ms-2"
              >
                Manage Scope Type
              </label>
              <select
                id="scopeTypeSelect"
                className="form-select form-select-md"
                value={managementScope.type || ""}
                onChange={(e) =>
                  setManagementScope({
                    type: e.target.value,
                    college:
                      e.target.value === PositionTypeEnum.USC
                        ? null
                        : managementScope.college,
                  })
                }
              >
                <option value={PositionTypeEnum.USC}>USC</option>
                <option value={PositionTypeEnum.CSC}>CSC</option>
              </select>
            </div>
            {managementScope.type === PositionTypeEnum.CSC && (
              <div className="col-md-4">
                <label
                  htmlFor="collegeScopeSelect"
                  className="form-label fs-7 text-secondary ms-2"
                >
                  Target College (for CSC):
                </label>
                <select
                  id="collegeScopeSelect"
                  className="form-select"
                  value={managementScope.college || ""}
                  onChange={(e) =>
                    setManagementScope((prev) => ({
                      ...prev,
                      college: e.target.value,
                    }))
                  }
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
        )}
      </div>

      {selectedElectionId && managementScope.type && (
        <div className="bg-white mt-4 rounded-4 border flex-grow-1 shadow-sm">
          <div
            className="px-3 py-3 rounded-top-4 bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "6px 6px",
            }}
          >
            <h4 className="text-secondary fs-4 fw-normal">
              {managementScope.type}
              {managementScope.type === PositionTypeEnum.CSC &&
              managementScope.college
                ? ` - ${managementScope.college}`
                : ""}{" "}
              Entities
            </h4>
            <p className="text-secondary fs-7 mb-0">
              For Election: {selectedElection?.name || "N/A"}
            </p>
          </div>

          {/* Tabs */}
          <ul
            className="nav nav-tabs px-3  bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "6px 6px",
            }}
          >
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "positions" ? "active" : "text-secondary"
                }`}
                onClick={() => setActiveTab("positions")}
              >
                Positions
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "partylists" ? "active" : "text-secondary"
                }`}
                onClick={() => setActiveTab("partylists")}
              >
                Partylists
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "candidates" ? "active" : "text-secondary"
                }`}
                onClick={() => setActiveTab("candidates")}
              >
                Candidates
              </button>
            </li>
          </ul>

          <div className="p-3">
            {/* Content based on activeTab */}
            {activeTab === "positions" && (
              <>
                <button
                  className="btn btn-success opacity-75 mb-3"
                  onClick={() => {
                    setEditingPosition(null);
                    setShowPositionModal(true);
                  }}
                  disabled={
                    !canManageCurrentScope() ||
                    !selectedElectionId ||
                    (managementScope.type === PositionTypeEnum.CSC &&
                      !managementScope.college)
                  }
                >
                  <i className="bi bi-plus-circle me-2"></i>Add Position
                </button>
                <AdminPositionList
                  positions={filteredPositions}
                  isLoading={isLoadingPositions}
                  onEdit={(pos) => {
                    setEditingPosition(pos);
                    setShowPositionModal(true);
                  }}
                  onDelete={handleDeletePosition}
                  canManage={canManageCurrentScope()}
                />
              </>
            )}

            {activeTab === "partylists" && (
              <>
                <button
                  className="btn btn-success mb-3 opacity-75"
                  onClick={() => {
                    setEditingPartylist(null);
                    setShowPartylistModal(true);
                  }}
                  disabled={
                    !canManageCurrentScope() ||
                    !selectedElectionId ||
                    (managementScope.type === PositionTypeEnum.CSC &&
                      !managementScope.college)
                  }
                >
                  <i className="bi bi-plus-circle me-2"></i>Add Partylist
                </button>
                <AdminPartylistList
                  partylists={filteredPartylists}
                  isLoading={isLoadingPartylists}
                  onEdit={(pl) => {
                    setEditingPartylist(pl);
                    setShowPartylistModal(true);
                  }}
                  onDelete={handleDeletePartylist}
                  canManage={canManageCurrentScope()}
                />
              </>
            )}

            {activeTab === "candidates" && (
              <>
                <button
                  className="btn btn-success mb-3 opacity-75"
                  onClick={() => {
                    setEditingCandidate(null);
                    setShowCandidateModal(true);
                  }}
                  disabled={
                    !canManageCurrentScope() ||
                    !selectedElectionId ||
                    (managementScope.type === PositionTypeEnum.CSC &&
                      !managementScope.college) ||
                    filteredPositions.length === 0
                  }
                  title={
                    filteredPositions.length === 0
                      ? "Add positions first for this scope."
                      : ""
                  }
                >
                  <i className="bi bi-plus-circle me-2"></i>Add Candidate
                </button>
                {/* TODO: Add Candidate List Filters UI here, updating `candidateListFilters` state */}
                <AdminCandidateList
                  candidates={filteredCandidates}
                  isLoading={
                    isLoadingCandidates ||
                    isLoadingPositions ||
                    isLoadingPartylists
                  } // Candidates depend on positions/partylists for display
                  onEdit={(cand) => {
                    setEditingCandidate(cand);
                    setShowCandidateModal(true);
                  }}
                  onDelete={handleDeleteCandidate}
                  canManage={canManageCurrentScope()}
                  managementScope={managementScope} // Pass scope for potential grouping/display logic in list
                  partylists={partylists}
                />
              </>
            )}
            {isLoadingCurrentTab && (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!selectedElectionId && elections.length > 0 && (
        <p className="p-3 text-info">
          Please select an election period to begin managing entities.
        </p>
      )}

      {/* Modals */}
      {showPositionModal && (
        <PositionForm
          show={showPositionModal}
          onClose={() => setShowPositionModal(false)}
          onSubmit={handleSubmitPosition}
          initialData={editingPosition}
          electionId={selectedElectionId}
          isLoading={isLoadingPositions} // Or a more specific form loading state
          managementScope={managementScope}
          userRole={session?.user?.role}
        />
      )}
      {showPartylistModal && (
        <PartylistForm
          show={showPartylistModal}
          onClose={() => setShowPartylistModal(false)}
          onSubmit={handleSubmitPartylist}
          initialData={editingPartylist}
          electionId={selectedElectionId}
          isLoading={isLoadingPartylists}
          managementScope={managementScope}
          userRole={session?.user?.role}
        />
      )}
      {showCandidateModal && (
        <CandidateForm
          show={showCandidateModal}
          onClose={() => setShowCandidateModal(false)}
          onSubmit={handleSubmitCandidate}
          initialData={editingCandidate}
          electionId={selectedElectionId}
          // Pass only positions and partylists that match the current managementScope
          positions={filteredPositions}
          partylists={filteredPartylists}
          isLoading={isLoadingCandidates}
          managementScope={managementScope}
          userRole={session?.user?.role}
        />
      )}
    </div>
  );
}
