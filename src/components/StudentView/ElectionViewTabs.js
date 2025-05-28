// src/components/StudentView/ElectionViewTabs.js
"use client";

import { useState } from "react";
import ScopedCandidateViewer from "./ScopedCandidateViewer"; // We'll create this next

export default function ElectionViewTabs({
  uscData,
  cscData,
  studentCollegeName,
  electionStatus,
}) {
  const [activeTab, setActiveTab] = useState("USC"); // Default to USC tab

  const hasCscData =
    cscData &&
    (cscData.positions?.length > 0 ||
      cscData.partylists?.length > 0 ||
      cscData.candidates?.length > 0);
  const hasUscData =
    uscData &&
    (uscData.positions?.length > 0 ||
      uscData.partylists?.length > 0 ||
      uscData.candidates?.length > 0);

  // If only one set of data is available, default to that tab.
  // This also handles the case where a student might not be enrolled in a college for CSC,
  // or if no CSC entities are configured for their college for this election.
  useState(() => {
    if (hasUscData && !hasCscData) {
      setActiveTab("USC");
    } else if (!hasUscData && hasCscData) {
      setActiveTab("CSC");
    } else {
      setActiveTab("USC"); // Default if both or neither have data (though parent page handles no election)
    }
  }, [hasUscData, hasCscData]);

  if (!hasUscData && !hasCscData) {
    return (
      <div className="alert alert-light text-center" role="alert">
        No candidates or electoral entities are currently listed for this
        election in your scope.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-4">
      <ul
        className="nav nav-tabs nav-fill mb-3"
        id="electionScopeTabs"
        role="tablist"
      >
        {hasUscData && (
          <li className="nav-item m-2" role="presentation">
            <button
              className={`nav-link rounded-3 border-0 ${
                activeTab === "USC"
                  ? "active text-dark"
                  : "text-secondary opacity-75"
              }`}
              id="usc-tab"
              data-bs-toggle="tab" // For Bootstrap JS if you use it, otherwise just for state
              type="button"
              role="tab"
              aria-controls="usc-content"
              aria-selected={activeTab === "USC"}
              onClick={() => setActiveTab("USC")}
              style={{
                fontSize: "1.1rem",
                fontWeight: activeTab === "USC" ? "500" : "normal",
              }}
            >
              <i className="bi bi-diagram-3-fill me-2"></i>USC
            </button>
          </li>
        )}
        {hasCscData && (
          <li className="nav-item m-2" role="presentation">
            <button
              className={`nav-link rounded-3 border-0 ${
                activeTab === "CSC"
                  ? "active text-dark"
                  : "text-secondary opacity-75"
              }`}
              id="csc-tab"
              data-bs-toggle="tab"
              type="button"
              role="tab"
              aria-controls="csc-content"
              aria-selected={activeTab === "CSC"}
              onClick={() => setActiveTab("CSC")}
              style={{
                fontSize: "1.1rem",
                fontWeight: activeTab === "CSC" ? "500" : "normal",
              }}
            >
              <i className="bi bi-diagram-2-fill me-2"></i>
              {studentCollegeName || "Your College"} CSC
            </button>
          </li>
        )}
      </ul>

      <div className="tab-content" id="electionScopeTabContent rounded-2">
        {hasUscData && activeTab === "USC" && (
          <div
            className={`tab-pane fade ${
              activeTab === "USC" ? "show active" : ""
            }`}
            id="usc-content"
            role="tabpanel"
            aria-labelledby="usc-tab"
          >
            <ScopedCandidateViewer
              key="usc-viewer" // Key helps React re-render if props change significantly for a scope switch
              scopeType="USC"
              scopeDisplayName="USC"
              positions={uscData.positions || []}
              partylists={uscData.partylists || []}
              candidates={uscData.candidates || []}
              electionStatus={electionStatus}
            />
          </div>
        )}
        {hasCscData && activeTab === "CSC" && (
          <div
            className={`tab-pane fade ${
              activeTab === "CSC" ? "show active" : ""
            }`}
            id="csc-content"
            role="tabpanel"
            aria-labelledby="csc-tab"
          >
            <ScopedCandidateViewer
              key="csc-viewer"
              scopeType="CSC"
              scopeDisplayName={`${studentCollegeName || "Your College"} CSC`}
              positions={cscData.positions || []}
              partylists={cscData.partylists || []}
              candidates={cscData.candidates || []}
              electionStatus={electionStatus}
              studentCollege={studentCollegeName} // Pass student's college for CSC context
            />
          </div>
        )}
      </div>
    </div>
  );
}
