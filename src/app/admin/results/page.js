// src/app/admin/results/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import VoterTurnoutDisplay from "@/components/Admin/ResultsView/VoterTurnoutDisplay";
import PositionResultsDisplay from "@/components/Admin/ResultsView/PositionResultsDisplay";

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
const ScopeTypeEnum = { USC: "USC", CSC: "CSC" };

export default function AdminResultsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [isLoadingElections, setIsLoadingElections] = useState(false);

  // For SuperAdmin/Auditor scope selection
  const [selectedScopeType, setSelectedScopeType] = useState(ScopeTypeEnum.USC); // Default for SA
  const [selectedCollege, setSelectedCollege] = useState(""); // For CSC scope by SA

  const [resultsData, setResultsData] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Determine fixed scope for Moderators
  useEffect(() => {
    if (session?.user?.role === "MODERATOR") {
      if (session.user.college) {
        // College Moderator
        setSelectedScopeType(ScopeTypeEnum.CSC);
        setSelectedCollege(session.user.college);
      } else {
        // USC Moderator
        setSelectedScopeType(ScopeTypeEnum.USC);
        setSelectedCollege(""); // Ensure college is cleared for USC scope
      }
    } else if (
      session?.user?.role === "SUPER_ADMIN" ||
      session?.user?.role === "AUDITOR"
    ) {
      // For SA/Auditor, allow them to pick. Default to USC if nothing is selected.
      if (!selectedScopeType) setSelectedScopeType(ScopeTypeEnum.USC);
    }
  }, [session, selectedScopeType]); // Added selectedScopeType to reset college if scope changes

  // Fetch all elections for the dropdown selector
  const fetchElectionsList = useCallback(async () => {
    setIsLoadingElections(true);
    try {
      const res = await fetch("/api/admin/elections"); // Admin route for all elections
      if (!res.ok) throw new Error("Failed to fetch elections list");
      const data = await res.json();
      setElections(data || []);
      if (data && data.length > 0 && !selectedElectionId) {
        // Auto-select the first election if none is selected
        // Prefer an ONGOING or most recent ENDED one if possible
        const ongoing = data.find((e) => e.status === "ONGOING");
        const ended = data
          .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
          .find((e) => e.status === "ENDED");
        const upcoming = data
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
          .find((e) => e.status === "UPCOMING");

        if (ongoing) setSelectedElectionId(ongoing.id);
        else if (ended) setSelectedElectionId(ended.id);
        else if (upcoming) setSelectedElectionId(upcoming.id);
        else setSelectedElectionId(data[0].id);
      }
    } catch (err) {
      setError("Error fetching elections: " + err.message);
    } finally {
      setIsLoadingElections(false);
    }
  }, [selectedElectionId]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchElectionsList();
    }
  }, [sessionStatus, fetchElectionsList]);

  // Fetch results data
  const fetchResults = useCallback(async () => {
    if (!selectedElectionId) {
      setResultsData(null); // Clear results if no election is selected
      return;
    }
    if (
      selectedScopeType === ScopeTypeEnum.CSC &&
      !selectedCollege &&
      (session?.user?.role === "SUPER_ADMIN" ||
        session?.user?.role === "AUDITOR")
    ) {
      setError("Please select a college for CSC scope results.");
      setResultsData(null);
      return;
    }

    setIsLoadingResults(true);
    setError("");
    setResultsData(null); // Clear previous results

    let apiUrl = `/api/admin/results?electionId=${selectedElectionId}`;
    if (selectedScopeType) {
      apiUrl += `&scopeType=${selectedScopeType}`;
    }
    if (selectedScopeType === ScopeTypeEnum.CSC && selectedCollege) {
      apiUrl += `&college=${selectedCollege}`;
    }

    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: "Failed to load results" }));
        throw new Error(errData.error || `API Error: ${res.status}`);
      }
      const data = await res.json();
      setResultsData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError("Error fetching results: " + err.message);
      setResultsData(null);
    } finally {
      setIsLoadingResults(false);
    }
  }, [
    selectedElectionId,
    selectedScopeType,
    selectedCollege,
    session?.user?.role,
  ]);

  // Fetch results when election or scope changes
  useEffect(() => {
    if (selectedElectionId && selectedScopeType) {
      if (
        selectedScopeType === ScopeTypeEnum.CSC &&
        !selectedCollege &&
        (session?.user?.role === "SUPER_ADMIN" ||
          session?.user?.role === "AUDITOR")
      ) {
        // Don't fetch if SA/Auditor selected CSC but not a college yet
        setResultsData(null); // Clear results
      } else {
        fetchResults();
      }
    }
  }, [
    fetchResults,
    selectedElectionId,
    selectedScopeType,
    selectedCollege,
    session?.user?.role,
  ]);

  if (sessionStatus === "loading")
    return <p className="p-4 text-center">Loading session...</p>;
  if (
    !session ||
    !["SUPER_ADMIN", "AUDITOR", "MODERATOR"].includes(session.user.role)
  ) {
    return (
      <p className="p-4 text-danger text-center">
        Access Denied. Insufficient privileges.
      </p>
    );
  }

  const handleScopeTypeChange = (e) => {
    setSelectedScopeType(e.target.value);
    if (e.target.value === ScopeTypeEnum.USC) {
      setSelectedCollege(""); // Clear college if USC is selected
    }
    setResultsData(null); // Clear results on scope change before fetching new ones
  };

  const handleCollegeChange = (e) => {
    setSelectedCollege(e.target.value);
    setResultsData(null);
  };

  return (
    <div className="container-fluid p-0 m-0">
      {/* Filters Section */}
      <div className="card shadow-sm mb-4 rounded-4 p-0">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label
                htmlFor="electionSelect"
                className="form-label fw-normal text-secondary fs-7 ms-2"
              >
                Election Period:
              </label>
              <select
                id="electionSelect"
                className="form-select"
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                disabled={isLoadingElections || elections.length === 0}
              >
                <option value="">
                  {isLoadingElections
                    ? "Loading..."
                    : elections.length === 0
                    ? "No elections"
                    : "-- Select Election --"}
                </option>
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name}
                  </option>
                ))}
              </select>
            </div>

            {(session.user.role === "SUPER_ADMIN" ||
              session.user.role === "AUDITOR") && (
              <>
                <div className="col-md-3">
                  <label
                    htmlFor="scopeTypeSelect"
                    className="form-label fw-normal text-secondary fs-7 ms-2"
                  >
                    Scope:
                  </label>
                  <select
                    id="scopeTypeSelect"
                    className="form-select"
                    value={selectedScopeType}
                    onChange={handleScopeTypeChange}
                  >
                    <option value={ScopeTypeEnum.USC}>USC</option>
                    <option value={ScopeTypeEnum.CSC}>CSC</option>
                  </select>
                </div>
                {selectedScopeType === ScopeTypeEnum.CSC && (
                  <div className="col-md-3">
                    <label
                      htmlFor="collegeSelect"
                      className="form-label fw-medium"
                    >
                      College (for CSC):
                    </label>
                    <select
                      id="collegeSelect"
                      className="form-select"
                      value={selectedCollege}
                      onChange={handleCollegeChange}
                    >
                      <option value="">-- Select College --</option>
                      {Object.values(CollegeEnum).map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <div className="col-md-2">
              <button
                className="btn btn-primary w-100"
                onClick={fetchResults}
                disabled={
                  isLoadingResults ||
                  !selectedElectionId ||
                  (selectedScopeType === ScopeTypeEnum.CSC &&
                    !selectedCollege &&
                    (session?.user?.role === "SUPER_ADMIN" ||
                      session?.user?.role === "AUDITOR"))
                }
              >
                {isLoadingResults ? (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                ) : (
                  <i className="bi bi-arrow-clockwise"></i>
                )}{" "}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {resultsData && lastRefreshed && (
          <small
            className="text-secondary opacity-75 text-end card-footer rounded-bottom-4 bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "6px 6px",
            }}
          >
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </small>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {isLoadingResults && (
        <div className="text-center py-5">
          <div
            className="spinner-border text-primary"
            style={{ width: "3rem", height: "3rem" }}
            role="status"
          >
            <span className="visually-hidden">Loading results...</span>
          </div>
          <p className="mt-2">Loading results...</p>
        </div>
      )}

      {!isLoadingResults &&
        !resultsData &&
        selectedElectionId &&
        !(
          selectedScopeType === ScopeTypeEnum.CSC &&
          !selectedCollege &&
          (session?.user?.role === "SUPER_ADMIN" ||
            session?.user?.role === "AUDITOR")
        ) && (
          <div className="alert alert-info text-center">
            Please select all required filters (Election, Scope, and College if
            CSC for Admin/Auditor) and click Refresh, or results might not be
            available for this selection.
          </div>
        )}

      {resultsData && (
        <div className="card rounded-4 shadow-sm">
          <h3
            className="mb-3 h5 text-secondary fw-normal card-header rounded-top-4 bg-white border-bottom"
            style={{
              backgroundImage:
                "radial-gradient(circle,rgb(241, 241, 241) 1px, transparent 1px)",
              backgroundSize: "6px 6px",
            }}
          >
            Results for: {resultsData.electionName} ({resultsData.scope.type}
            {resultsData.scope.college ? ` - ${resultsData.scope.college}` : ""}
            )
          </h3>
          <div className="card-body p-3">
            <VoterTurnoutDisplay turnoutData={resultsData.voterTurnout} />

            {resultsData.positions && resultsData.positions.length > 0 ? (
              resultsData.positions.map((positionResult) => (
                <PositionResultsDisplay
                  key={positionResult.id}
                  positionResult={positionResult}
                />
              ))
            ) : (
              <div className="alert alert-secondary mt-4">
                No positions (and thus no results) found for this specific scope
                in the selected election.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
