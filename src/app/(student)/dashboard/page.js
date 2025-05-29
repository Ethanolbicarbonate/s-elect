// src/app/(student)/dashboard/page.js
import ElectionStatusWidget from "@/components/Dashboard/ElectionStatusWidget";
import VoterStatusWidget from "@/components/Dashboard/VoterStatusWidget";
import ElectionCalendarWidget from "@/components/Dashboard/ElectionCalendarWidget";
import VoterTurnoutWidget from "@/components/Dashboard/VoterTurnoutWidget";
import ElectionNotificationWidget from "@/components/Dashboard/ElectionNotificationWidget";
import ResultsDashboardWidget from "@/components/Dashboard/ResultsDashboardWidget";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers"; // <--- IMPORT THIS
// No longer need College enum or helper functions here as backend handles it

export default async function DashboardPage() {
  const session = await getServerSession(authOptions); // This gets session for the page render

  let activeElectionDetails = null;
  let apiError = null;

  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const apiUrl = new URL(
    "/api/student/active-election-details",
    appUrl
  ).toString();

  console.log("Fetching from API URL:", apiUrl);

  try {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie");

    const fetchOptions = {
      cache: "no-store",
      headers: {},
    };

    if (cookieHeader) {
      fetchOptions.headers["Cookie"] = cookieHeader;
    }
    // console.log("Fetching API with options:", JSON.stringify(fetchOptions, null, 2));

    const res = await fetch(apiUrl, fetchOptions);

    if (res.ok) {
      activeElectionDetails = await res.json();
    } else {
      const errorData = await res.json().catch(() => ({
        error: `Failed to fetch active election details. Status: ${res.status}`,
      }));
      apiError = errorData.error || `Error ${res.status}`;
      console.error(
        "Failed to fetch active election for dashboard:",
        apiError,
        "URL:",
        apiUrl,
        "Response Status:",
        res.status
      );
    }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch failed")) {
      apiError = `Network error or failed to resolve host: ${
        new URL(apiUrl).hostname
      }. Ensure NEXTAUTH_URL is correct.`;
    } else {
      apiError =
        err.message ||
        "An unexpected error occurred while fetching election data.";
    }
    console.error("Error in dashboard page fetching election:", err);
  }

  // Prepare data for widgets based on the fetched activeElectionDetails
  let electionStatusForWidget = "N/A";
  let electionMessageForWidget = "No active or upcoming election.";
  let electionPeriodForCalendar = null; // Singular event for calendar
  let hasVoted = false;

  if (apiError) {
    electionMessageForWidget = "Could not load election data.";
  } else if (activeElectionDetails) {
    electionStatusForWidget = activeElectionDetails.effectiveStatusForStudent;
    electionMessageForWidget = activeElectionDetails.name;

    electionPeriodForCalendar = {
      id: activeElectionDetails.id,
      name: activeElectionDetails.name,
      startDate: new Date(activeElectionDetails.startDate), // Use original start date
      //effective end date calculated by the backend
      endDate: new Date(activeElectionDetails.effectiveEndDateForStudent),
    };
  }

  const showResults =
    activeElectionDetails &&
    activeElectionDetails.effectiveStatusForStudent === "ENDED";
  // additional check here if results are to be published explicitly by admin: not implemented
  // && activeElectionDetails.resultsPublished === true
  // (requires: resultsPublished field to Election model and admin UI)

  return (
    <div>
      {apiError && (
        <div className="alert alert-danger">
          Error loading election data: {apiError}
        </div>
      )}
      <div className="row mb-4 g-4">
        <div className="col-md-6 col-lg-4 d-flex flex-column">
          <div className="mb-4 flex-grow-1">
            <ElectionStatusWidget
              status={electionStatusForWidget}
              message={electionMessageForWidget}
            />
          </div>
          <div className="flex-grow-1">
            <VoterStatusWidget
              hasVoted={hasVoted} // This needs to be specific to the activeElectionDetails.id
              electionOngoing={electionStatusForWidget === "ONGOING"}
              electionId={activeElectionDetails?.id} // Pass electionId for more specific vote check
            />
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <ElectionCalendarWidget
            electionPeriod={electionPeriodForCalendar} // Pass the single election period object
          />
        </div>

        <div className="col-lg-4">
          <ElectionNotificationWidget />
        </div>
      </div>

      <div className="col-lg-12 mb-4">
        <VoterTurnoutWidget electionId={activeElectionDetails?.id} />
      </div>

      <div className="col-lg-12 d-flex flex-column">
        {showResults ? (
          <ResultsDashboardWidget
            electionDetails={activeElectionDetails}
            studentCollege={session?.user?.college} // Pass student's college for CSC filtering
          />
        ) : (
          <div className="card shadow-sm p-4 text-center text-muted">
            <i className="bi bi-bar-chart-fill display-4 mb-3"></i>
            <h5 className="mb-0">Election Results Coming Soon</h5>
            <p className="small mb-0">
              Results will be displayed here once the election concludes and
              final tallies are complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
