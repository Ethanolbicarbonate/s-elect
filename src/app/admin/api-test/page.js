// src/app/admin/api-test/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

// Enums from Prisma (ensure these match your schema definition if not imported)
const College = {
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
const PositionType = { USC: "USC", CSC: "CSC" }; // Used for both Position and
const ElectionStatus = {
  UPCOMING: "UPCOMING",
  ONGOING: "ONGOING",
  ENDED: "ENDED",
};

export default function ApiTestPage() {
  const { data: session } = useSession();
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  // --- Positions State & Handlers (mostly unchanged) ---
  const [positions, setPositions] = useState([]);
  const [positionForm, setPositionForm] = useState({
    name: "",
    description: "",
    type: PositionType.USC,
    college: "",
    maxVotesAllowed: 1,
    minVotesRequired: 0,
    order: 0,
  });
  // --- Partylists State & Handlers (UPDATED) ---
  const [partylists, setPartylists] = useState([]);
  const [partylistForm, setPartylistForm] = useState({
    name: "",
    acronym: "",
    logoUrl: "",
    platform: "",
    type: PositionType.USC, // Default type for new partylist form
    college: "", // College, conditional on type
  });
  // --- Candidates State & Handlers (mostly unchanged) ---
  const [candidates, setCandidates] = useState([]);
  const [candidateForm, setCandidateForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    nickname: "",
    photoUrl: "",
    bio: "",
    platformPoints: "",
    isIndependent: false,
    positionId: "",
    partylistId: "",
  });
  const [availablePositions, setAvailablePositions] = useState([]);
  const [
    availablePartylistsForCandidates,
    setAvailablePartylistsForCandidates,
  ] = useState([]); // Renamed for clarity

  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch elections on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/elections");
        const data = await res.json();
        if (res.ok) {
          setElections(data);
          if (data.length > 0) setSelectedElectionId(data[0].id);
        } else setApiError(data.error || "Failed to fetch elections");
      } catch (err) {
        setApiError(err.message);
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  // Fetch related data when selectedElectionId changes
  useEffect(() => {
    if (selectedElectionId) {
      fetchPositionsForElection(selectedElectionId);
      fetchPartylistsForElection(selectedElectionId);
      fetchCandidatesForElection(selectedElectionId);
    } else {
      setPositions([]);
      setPartylists([]);
      setCandidates([]);
      setAvailablePositions([]);
      setAvailablePartylistsForCandidates([]);
    }
  }, [selectedElectionId]);

  // Fetch positions for the selected election (used for candidate form dropdown)
  const fetchPositionsForElection = async (electionId) => {
    if (!electionId) return;
    try {
      /* ... unchanged ... */
      const res = await fetch(`/api/admin/elections/${electionId}/positions`);
      const data = await res.json();
      if (res.ok) {
        setPositions(data);
        setAvailablePositions(data);
      } else {
        setApiError(data.error || "Failed to fetch positions for election.");
        setPositions([]);
        setAvailablePositions([]);
      }
    } catch (err) {
      setApiError(err.message);
      setPositions([]);
      setAvailablePositions([]);
    }
  };

  // Fetch partylists for the selected election (used for candidate form dropdown)
  const fetchPartylistsForElection = async (electionId) => {
    if (!electionId) return;
    try {
      /* ... unchanged ... */
      const res = await fetch(`/api/admin/elections/${electionId}/partylists`);
      const data = await res.json();
      if (res.ok) {
        setPartylists(data);
        // For candidate form, filter partylists based on candidate's potential position scope (more advanced)
        // For now, candidate form will use all partylists from the election for simplicity in test page
        setAvailablePartylistsForCandidates(data);
      } else {
        setApiError(data.error || "Failed to fetch partylists for election.");
        setPartylists([]);
        setAvailablePartylistsForCandidates([]);
      }
    } catch (err) {
      setApiError(err.message);
      setPartylists([]);
      setAvailablePartylistsForCandidates([]);
    }
  };

  // Fetch candidates for the selected election
  const fetchCandidatesForElection = async (electionId) => {
    // ... (implementation mostly unchanged, just uses generic candidates endpoint for the election)
    if (!electionId) return;
    try {
      // Construct query to be more specific if needed, e.g. by scope from URL if this page had it
      const res = await fetch(`/api/admin/candidates?electionId=${electionId}`);
      const data = await res.json();
      if (res.ok) setCandidates(data);
      else {
        setApiError(data.error || "Failed to fetch candidates");
        setCandidates([]);
      }
    } catch (err) {
      setApiError(err.message);
      setCandidates([]);
    }
  };

  const handleFormChange = (e, formSetter, isCheckbox = false) => {
    const { name, value, checked } = e.target;
    formSetter((prev) => ({ ...prev, [name]: isCheckbox ? checked : value }));

    if (name === "type" && value === PositionType.USC) {
      if (formSetter === setPositionForm)
        formSetter((prev) => ({ ...prev, college: "" }));
      if (formSetter === setPartylistForm)
        formSetter((prev) => ({ ...prev, college: "" }));
    }
  };

  const makeApiCall = async (url, method, body) => {
    // ... (implementation unchanged - this generic function is fine) ...
    setIsLoading(true);
    setApiResponse(null);
    setApiError(null);
    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body && method !== "GET" && method !== "DELETE") {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const responseText = await res.text();

      if (res.status === 204) {
        setApiResponse({
          message: `${
            method === "DELETE" ? "Deleted" : "Operation successful"
          } (No Content)`,
        });
      } else if (!res.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error(
            responseText || `API call failed with status ${res.status}`
          );
        }
        throw new Error(
          errorData.error || `API call failed with status ${res.status}`
        );
      } else {
        setApiResponse(JSON.parse(responseText));
      }

      // Refresh relevant list after CUD operation
      if (method === "POST" || method === "PUT" || method === "DELETE") {
        if (url.includes("/positions"))
          fetchPositionsForElection(selectedElectionId);
        else if (url.includes("/partylists"))
          fetchPartylistsForElection(selectedElectionId);
        else if (url.includes("/candidates"))
          fetchCandidatesForElection(selectedElectionId);
      }
    } catch (err) {
      setApiError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  if (!session || !["SUPER_ADMIN", "MODERATOR"].includes(session.user?.role)) {
    return (
      <p className="p-4 text-danger">
        Access Denied. This test page is for Super Admins or Moderators.
      </p>
    );
  }

  return (
    <div className="container-fluid p-4">
      <h1>API Test Page V2 (Admin)</h1>
      {isLoading && <div className="alert alert-info">Loading...</div>}
      {apiError && <div className="alert alert-danger">Error: {apiError}</div>}
      {apiResponse && (
        <div className="alert alert-success">
          Success: <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="electionSelect" className="form-label">
          Select Election to Manage:
        </label>
        <select
          id="electionSelect"
          className="form-select"
          value={selectedElectionId}
          onChange={(e) => setSelectedElectionId(e.target.value)}
          disabled={elections.length === 0}
        >
          <option value="">-- Select an Election --</option>
          {elections.map((el) => (
            <option key={el.id} value={el.id}>
              {el.name} ({el.status})
            </option>
          ))}
        </select>
      </div>
      <hr />

      {/* --- Positions Section (largely unchanged from previous api-test) --- */}
      <section className="mb-5 p-3 border rounded">
        <h2>
          Positions for Election:{" "}
          {selectedElectionId
            ? elections.find((e) => e.id === selectedElectionId)?.name
            : "None Selected"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            makeApiCall(
              `/api/admin/elections/${selectedElectionId}/positions`,
              "POST",
              positionForm
            );
          }}
          className="mb-3 p-2 border rounded bg-light"
        >
          <h5>Create Position</h5>
          {/* Inputs for positionForm: name, description, type, college (conditional), maxVotesAllowed, minVotesRequired, order */}
          <input
            type="text"
            name="name"
            placeholder="Position Name"
            value={positionForm.name}
            onChange={(e) => handleFormChange(e, setPositionForm)}
            required
            className="form-control mb-1"
          />
          <textarea
            name="description"
            placeholder="Description"
            value={positionForm.description}
            onChange={(e) => handleFormChange(e, setPositionForm)}
            className="form-control mb-1"
          />
          <select
            name="type"
            value={positionForm.type}
            onChange={(e) => handleFormChange(e, setPositionForm)}
            className="form-select mb-1"
          >
            {Object.values(PositionType).map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
          {positionForm.type === PositionType.CSC && (
            <select
              name="college"
              value={positionForm.college}
              onChange={(e) => handleFormChange(e, setPositionForm)}
              className="form-select mb-1"
              required
            >
              <option value="">-- Select College --</option>
              {Object.values(College).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            name="maxVotesAllowed"
            placeholder="Max Votes"
            value={positionForm.maxVotesAllowed}
            onChange={(e) => handleFormChange(e, setPositionForm)}
            required
            className="form-control mb-1"
            min="1"
          />
          <input
            type="number"
            name="minVotesRequired"
            placeholder="Min Votes (0)"
            value={positionForm.minVotesRequired}
            onChange={(e) => handleFormChange(e, setPositionForm)}
            className="form-control mb-1"
            min="0"
          />
          <input
            type="number"
            name="order"
            placeholder="Display Order"
            value={positionForm.order}
            onChange={(e) => handleFormChange(e, setPositionForm)}
            required
            className="form-control mb-1"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isLoading || !selectedElectionId}
          >
            Create Position
          </button>
        </form>
        <h6>Existing Positions:</h6>
        <ul>
          {positions.map((p) => (
            <li key={p.id}>
              {p.order}. {p.name} ({p.type}
              {p.college ? ` - ${p.college}` : ""}) - MaxVotes:{" "}
              {p.maxVotesAllowed}
              <button
                onClick={() =>
                  makeApiCall(
                    `/api/admin/elections/${selectedElectionId}/positions/${p.id}`,
                    "DELETE"
                  )
                }
                className="btn btn-danger btn-sm ms-2"
                disabled={isLoading || !selectedElectionId}
              >
                X
              </button>
            </li>
          ))}
        </ul>
      </section>
      <hr />

      {/* --- Partylists Section (UPDATED) --- */}
      <section className="mb-5 p-3 border rounded">
        <h2>
          Partylists for Election:{" "}
          {selectedElectionId
            ? elections.find((e) => e.id === selectedElectionId)?.name
            : "None Selected"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            makeApiCall(
              `/api/admin/elections/${selectedElectionId}/partylists`,
              "POST",
              partylistForm
            );
          }}
          className="mb-3 p-2 border rounded bg-light"
        >
          <h5>Create Partylist</h5>
          <input
            type="text"
            name="name"
            placeholder="Partylist Name"
            value={partylistForm.name}
            onChange={(e) => handleFormChange(e, setPartylistForm)}
            required
            className="form-control mb-1"
          />
          <input
            type="text"
            name="acronym"
            placeholder="Acronym"
            value={partylistForm.acronym}
            onChange={(e) => handleFormChange(e, setPartylistForm)}
            className="form-control mb-1"
          />

          {/* New fields for Partylist type and college */}
          <div className="row gx-2 mb-1">
            <div className="col">
              <label className="form-label form-label-sm">Type</label>
              <select
                name="type"
                value={partylistForm.type}
                onChange={(e) => handleFormChange(e, setPartylistForm)}
                className="form-select form-select-sm"
              >
                {Object.values(PositionType).map((pt) => (
                  <option key={`pl-${pt}`} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
            {partylistForm.type === PositionType.CSC && (
              <div className="col">
                <label className="form-label form-label-sm">
                  College (for CSC)
                </label>
                <select
                  name="college"
                  value={partylistForm.college}
                  onChange={(e) => handleFormChange(e, setPartylistForm)}
                  className="form-select form-select-sm"
                  required
                >
                  <option value="">-- Select College --</option>
                  {Object.values(College).map((c) => (
                    <option key={`pl-col-${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <input
            type="text"
            name="logoUrl"
            placeholder="Logo URL (optional)"
            value={partylistForm.logoUrl}
            onChange={(e) => handleFormChange(e, setPartylistForm)}
            className="form-control mb-1"
          />
          <textarea
            name="platform"
            placeholder="Platform (optional)"
            value={partylistForm.platform}
            onChange={(e) => handleFormChange(e, setPartylistForm)}
            className="form-control mb-1"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isLoading || !selectedElectionId}
          >
            Create Partylist
          </button>
        </form>
        <h6>Existing Partylists:</h6>
        <ul>
          {partylists.map((pl) => (
            <li key={pl.id}>
              {pl.name} ({pl.acronym || "N/A"}) - Scope: {pl.type}
              {pl.college ? ` (${pl.college})` : ""}
              <button
                onClick={() =>
                  makeApiCall(
                    `/api/admin/elections/${selectedElectionId}/partylists/${pl.id}`,
                    "DELETE"
                  )
                }
                className="btn btn-danger btn-sm ms-2"
                disabled={isLoading || !selectedElectionId}
              >
                X
              </button>
            </li>
          ))}
        </ul>
      </section>
      <hr />

      {/* --- Candidates Section (largely unchanged, but uses availablePartylistsForCandidates) --- */}
      <section className="p-3 border rounded">
        <h2>
          Candidates for Election:{" "}
          {selectedElectionId
            ? elections.find((e) => e.id === selectedElectionId)?.name
            : "None Selected"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            makeApiCall(`/api/admin/candidates`, "POST", {
              ...candidateForm,
              electionId: selectedElectionId,
              platformPoints: candidateForm.platformPoints
                .split(",")
                .map((p) => p.trim())
                .filter((p) => p),
            });
          }}
          className="mb-3 p-2 border rounded bg-light"
        >
          <h5>Create Candidate</h5>
          {/* Inputs for candidateForm: firstName, lastName, platformPoints, isIndependent, positionId, partylistId */}
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={candidateForm.firstName}
            onChange={(e) => handleFormChange(e, setCandidateForm)}
            required
            className="form-control mb-1"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={candidateForm.lastName}
            onChange={(e) => handleFormChange(e, setCandidateForm)}
            required
            className="form-control mb-1"
          />
          {/* Add other optional candidate fields like middleName, nickname, photoUrl, bio as needed */}
          <textarea
            name="platformPoints"
            placeholder="Platform Points (comma-separated)"
            value={candidateForm.platformPoints}
            onChange={(e) => handleFormChange(e, setCandidateForm)}
            className="form-control mb-1"
          />
          <div className="form-check mb-1">
            <input
              type="checkbox"
              className="form-check-input"
              id="isIndependent"
              name="isIndependent"
              checked={candidateForm.isIndependent}
              onChange={(e) => handleFormChange(e, setCandidateForm, true)}
            />
            <label className="form-check-label" htmlFor="isIndependent">
              Is Independent?
            </label>
          </div>
          <select
            name="positionId"
            value={candidateForm.positionId}
            onChange={(e) => handleFormChange(e, setCandidateForm)}
            required
            className="form-select mb-1"
          >
            <option value="">-- Select Position --</option>
            {availablePositions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type}
                {p.college ? ` - ${p.college}` : ""})
              </option>
            ))}
          </select>
          {!candidateForm.isIndependent && (
            <select
              name="partylistId"
              value={candidateForm.partylistId}
              onChange={(e) => handleFormChange(e, setCandidateForm)}
              className="form-select mb-1"
              required={!candidateForm.isIndependent}
            >
              <option value="">-- Select Partylist --</option>
              {/* 
                      For a more robust test page, this dropdown should ideally be filtered 
                      to show only partylists whose scope (type/college) matches the selected position's scope.
                      For now, it shows all partylists in the election. The backend will validate.
                    */}
              {availablePartylistsForCandidates.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.type}
                  {pl.college ? ` - ${pl.college}` : ""})
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isLoading || !selectedElectionId}
          >
            Create Candidate
          </button>
        </form>
        <h6>Existing Candidates:</h6>
        <ul>
          {candidates.map((c) => (
            <li key={c.id}>
              {c.firstName} {c.lastName} - Pos: {c.position?.name} (
              {c.position?.type}
              {c.position?.college ? ` - ${c.position.college}` : ""}) - Party:{" "}
              {c.isIndependent ? "Independent" : c.partylist?.name || "N/A"} (
              {c.partylist?.type}
              {c.partylist?.college ? ` - ${c.partylist.college}` : ""})
              <button
                onClick={() =>
                  makeApiCall(`/api/admin/candidates/${c.id}`, "DELETE")
                }
                className="btn btn-danger btn-sm ms-2"
                disabled={isLoading}
              >
                X
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
