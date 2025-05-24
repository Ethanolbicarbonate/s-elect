// src/app/admin/election-settings/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import CreateElectionForm from "@/components/Admin/ElectionManagement/CreateElectionForm";
import ElectionListTable from "@/components/Admin/ElectionManagement/ElectionListTable";
import EditGeneralElectionModal from "@/components/Admin/ElectionManagement/EditGeneralElectionModal";
import ExtendElectionModal from "@/components/Admin/ElectionManagement/ExtendElectionModal";

// Enums can be defined here or imported from a shared constants file
const collegeEnumArray = [
  "CAS",
  "CBM",
  "COC",
  "COD",
  "COE",
  "CICT",
  "COL",
  "COM",
  "CON",
  "PESCAR",
];
const electionStatusEnum = [
  "UPCOMING",
  "ONGOING",
  "PAUSED",
  "ENDED",
  "ARCHIVED",
];

export default function ElectionSettingsPage() {
  const { data: session } = useSession();
  const [elections, setElections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState(""); // For page-level messages
  const [pageSuccessMessage, setPageSuccessMessage] = useState("");

  const [editingElection, setEditingElection] = useState(null); // Full election object for edit modal
  const [extendingElection, setExtendingElection] = useState(null); // Full election object for extend modal

  const clearPageMessages = () => {
    setPageError("");
    setPageSuccessMessage("");
  };

  const displayPageMessage = (message, isSuccess = true) => {
    clearPageMessages();
    if (isSuccess) setPageSuccessMessage(message);
    else setPageError(message);
    setTimeout(() => clearPageMessages(), 5000); // Auto-clear after 5s
  };

  const fetchElections = async () => {
    setIsLoading(true);
    clearPageMessages();
    try {
      const res = await fetch("/api/admin/elections");
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch elections");
      }
      const data = await res.json();
      setElections(data);
    } catch (err) {
      displayPageMessage(err.message, false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const handleSubmitCreateElection = async (formDataFromForm) => {
    setIsLoading(true);
    clearPageMessages();
    try {
      const localStartDate = new Date(formDataFromForm.startDate); // Parsed as local time
      const localEndDate = new Date(formDataFromForm.endDate); // Parsed as local time

      if (localStartDate >= localEndDate) {
        displayPageMessage("Start date must be before end date.", false);
        setIsLoading(false);
        return false;
      }

      const payload = {
        ...formDataFromForm,
        startDate: localStartDate.toISOString(), // Send UTC ISO string
        endDate: localEndDate.toISOString(), // Send UTC ISO string
      };

      const res = await fetch("/api/admin/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // Send payload with UTC strings
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create election.");
      }
      displayPageMessage("Election created successfully!");
      fetchElections();
      return true; // Indicate success to form
    } catch (err) {
      displayPageMessage(err.message, false);
      return false; // Indicate failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGeneralElection = async (electionId, formDataFromModal) => {
    setIsLoading(true);
    clearPageMessages();
    try {
      // --- FIX: Convert local datetime strings to UTC ISO strings ---
      const localStartDate = new Date(formDataFromModal.startDate);
      const localEndDate = new Date(formDataFromModal.endDate);

      if (localStartDate >= localEndDate) {
        // This validation can also be done in the modal before calling this,
        // but good to have a server-side check or a pre-API call check here too.
        // For now, relying on modal's validation. If it passes, this should too.
      }

      const payload = {
        name: formDataFromModal.name,
        description: formDataFromModal.description,
        startDate: localStartDate.toISOString(), // Send UTC ISO string
        endDate: localEndDate.toISOString(), // Send UTC ISO string
        status: formDataFromModal.status,
      };
      const res = await fetch(`/api/admin/elections/${electionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Failed to update general election details."
        );
      }
      displayPageMessage("General election details updated successfully!");
      fetchElections();
      setEditingElection(null); // Close modal
      return true;
    } catch (err) {
      displayPageMessage(err.message, false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitExtension = async (electionId, extensionData) => {
    setIsLoading(true);
    clearPageMessages();
    try {
      const res = await fetch(`/api/admin/elections/${electionId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colleges: extensionData.selectedColleges,
          extendedEndDate: extensionData.extendedEndDate,
          reason: extensionData.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend election.");
      displayPageMessage(
        data.message || "Election extended successfully for selected colleges!"
      );
      fetchElections();
      setExtendingElection(null); // Close modal
      return true;
    } catch (err) {
      displayPageMessage(err.message, false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndElectionNow = async (electionId, currentStatus) => {
    if (currentStatus === "ENDED" || currentStatus === "ARCHIVED") {
      alert(`Election is already ${currentStatus}.`);
      return;
    }
    if (!confirm(`Are you sure you want to "end" this election now?`)) return;

    setIsLoading(true);
    clearPageMessages();
    try {
      const res = await fetch(`/api/admin/elections/${electionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to end election.");
      }
      displayPageMessage("Election ended successfully.");
      fetchElections();
    } catch (err) {
      displayPageMessage(err.message, false);
    } finally {
      setIsLoading(false);
    }
  };

  if (session?.user?.role !== "SUPER_ADMIN") {
    return (
      <p className="text-danger p-4">
        Access Denied. Only Super Admins can manage election settings.
      </p>
    );
  }

  return (
    <div className="container-fluid p-0 m-0">
      {pageError && <div className="alert alert-danger">{pageError}</div>}
      {pageSuccessMessage && (
        <div className="alert alert-success">{pageSuccessMessage}</div>
      )}

      <CreateElectionForm
        isLoading={isLoading}
        onSubmitCreate={handleSubmitCreateElection}
        pageError={pageError} // Pass down if form needs to show its own error, or rely on page-level
        pageSuccessMessage={pageSuccessMessage}
        clearPageMessages={clearPageMessages}
      />

      <ElectionListTable
        elections={elections}
        isLoading={isLoading && elections.length === 0} // Show table loading only if no data yet
        onEditGeneralClick={(election) => setEditingElection(election)}
        onExtendClick={(election) => setExtendingElection(election)}
        onEndElectionNow={handleEndElectionNow}
      />

      {editingElection && (
        <EditGeneralElectionModal
          show={!!editingElection}
          onClose={() => setEditingElection(null)}
          electionData={editingElection}
          isLoading={isLoading}
          onSubmitUpdate={handleUpdateGeneralElection}
          electionStatusEnum={electionStatusEnum}
        />
      )}

      {extendingElection && (
        <ExtendElectionModal
          show={!!extendingElection}
          onClose={() => setExtendingElection(null)}
          electionData={extendingElection}
          isLoading={isLoading}
          onSubmitExtension={handleSubmitExtension}
          collegeEnumArray={collegeEnumArray}
        />
      )}
    </div>
  );
}
