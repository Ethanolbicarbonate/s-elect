import ElectionStatusWidget from "@/components/Dashboard/ElectionStatusWidget";
import VoterStatusWidget from "@/components/Dashboard/VoterStatusWidget";
import ElectionCalendarWidget from "@/components/Dashboard/ElectionCalendarWidget";
import VoterTurnoutWidget from "@/components/Dashboard/VoterTurnoutWidget";
import ResultsWidget from "@/components/Dashboard/ResultsWidget";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { College } from "@prisma/client"; // Import College enum client-side if needed for logic

// --- Helper Functions to Process Election Data ---

// Determines the effective end date for a student in a given election
function getEffectiveEndDateForStudent(election, studentCollege) {
  const mainEndDate = new Date(election.endDate);

  // Find if there's an extension for the student's college
  const collegeExtension = election.extensions?.find(
    (ext) => ext.college === studentCollege
  );

  // If an extension exists and its end date is after the main end date, use the extended date
  if (
    collegeExtension &&
    new Date(collegeExtension.extendedEndDate) > mainEndDate
  ) {
    return new Date(collegeExtension.extendedEndDate);
  }

  // Otherwise, use the main election end date
  return mainEndDate;
}

// Calculates the effective status for a student in a given election based on effective end date
function getEffectiveStatusForStudent(election, studentCollege) {
  const now = new Date();
  const mainStartDate = new Date(election.startDate);
  // The effectiveEndDate calculation should remain as it considers extensions
  const effectiveEndDate = getEffectiveEndDateForStudent(
    election,
    studentCollege
  );

  // **PRIORITIZE EXPLICIT FINAL STATUSES**
  if (election.status === "ENDED" || election.status === "ARCHIVED") {
    return election.status; // If admin explicitly ended or archived it, that's the status.
  }
  if (election.status === "PAUSED") {
    return "PAUSED";
  }

  // If status is UPCOMING or ONGOING (or not yet explicitly ended/archived by an admin), calculate dynamically
  if (now >= mainStartDate && now <= effectiveEndDate) {
    return "ONGOING";
  } else if (now < mainStartDate) {
    return "UPCOMING";
  } else {
    // now > effectiveEndDate (and not manually set to ENDED/ARCHIVED yet)
    return "ENDED"; // Dynamically determined to be ended based on dates
  }
}
// Finds the most relevant election for the student based on status and college
function getRelevantElectionForStudent(allElections, studentCollege) {
  const now = new Date();

  // Helper to get a sortable effective status
  const getSortableStatus = (e) => {
    const status = getEffectiveStatusForStudent(e, studentCollege);
    if (status === "ONGOING") return 1;
    if (status === "UPCOMING") return 2;
    if (status === "PAUSED") return 3;
    if (status === "ENDED") return 4;
    if (status === "ARCHIVED") return 5;
    return 6; // Default for unknown
  };

  // Filter out ARCHIVED unless it's the only thing left
  const activeOrUpcomingElections = allElections.filter(
    (e) => e.status !== "ARCHIVED"
  );

  if (activeOrUpcomingElections.length > 0) {
    // Sort by: 1. ONGOING, 2. UPCOMING, then by start date (most recent upcoming first)
    // For ONGOING, might want to sort by end date (closest to ending first)
    activeOrUpcomingElections.sort((a, b) => {
      const statusA = getSortableStatus(a);
      const statusB = getSortableStatus(b);
      if (statusA !== statusB) return statusA - statusB; // Sort by status priority

      // If same status, for ONGOING, sort by soonest effective end date
      if (getEffectiveStatusForStudent(a, studentCollege) === "ONGOING") {
        return (
          getEffectiveEndDateForStudent(a, studentCollege).getTime() -
          getEffectiveEndDateForStudent(b, studentCollege).getTime()
        );
      }
      // For UPCOMING, sort by soonest start date
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
    return activeOrUpcomingElections[0]; // Return the most relevant (ongoing or soonest upcoming)
  } else if (allElections.length > 0) {
    // If no active/upcoming, show the most recently ended/archived
    allElections.sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );
    return allElections[0];
  }
  return null;
}

// --- Main Dashboard Page Component ---
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const studentCollege = session?.user?.college;

  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/elections`, {
    cache: "no-store",
  });

  let allElections = [];
  if (res.ok) {
    allElections = await res.json();
  } else {
    console.error(
      "Failed to fetch elections for dashboard:",
      res.status,
      await res.text()
    );
  }

  const relevantElectionForStatus = getRelevantElectionForStudent(
    allElections,
    studentCollege
  );
  // Filter elections that should appear on the calendar (not ARCHIVED, potentially not ENDED?)
  // Let's keep ENDED elections on the calendar for historical view for now.
  const electionEventsForCalendar = allElections
    .filter((e) => e.status !== "ARCHIVED" && e.status !== "ENDED") // <<<< MODIFIED FILTER
    .map((e) => ({
      id: e.id,
      name: e.name,
      startDate: new Date(e.startDate),
      // Pass the effective end date which considers extensions for the student
      endDate: getEffectiveEndDateForStudent(e, studentCollege),
      type: e.type, // This 'type' was from the old schema. Election model doesn't have it.
      // You might want to remove 'type' from here or assign a default if needed by calendar dot color.
      // For a single dot type, it's not needed.
    }));

  // Calculate the status message for the status widget
  let electionStatus = "N/A";
  let electionMessage = "No active or upcoming election.";
  let hasVoted = false;

  if (relevantElectionForStatus) {
    electionStatus = getEffectiveStatusForStudent(
      relevantElectionForStatus,
      studentCollege
    );
    electionMessage = relevantElectionForStatus.name;
    // TODO: Fetch actual hasVoted status
  }

  return (
    <div>
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-4 d-flex flex-column">
          <div className="mb-4 flex-grow-1">
            <ElectionStatusWidget
              status={electionStatus}
              message={electionMessage}
            />
          </div>
          <div className="flex-grow-1">
            <VoterStatusWidget
              hasVoted={hasVoted}
              electionOngoing={electionStatus === "ONGOING"}
            />
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <ElectionCalendarWidget
            electionEvents={electionEventsForCalendar} // Pass array of {date, type, name}
          />
        </div>

        <div className="col-lg-4">
          <VoterTurnoutWidget />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <ResultsWidget election={relevantElectionForStatus} />
        </div>
      </div>
    </div>
  );
}
