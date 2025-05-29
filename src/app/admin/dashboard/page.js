// src/app/admin/dashboard/page.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers"; // For forwarding cookies in server-side fetch
import Link from "next/link"; // For navigation links

// Import the dashboard widgets
import OverviewWidget from "@/components/Admin/Dashboard/OverviewWidget";
import AdminVoterTurnoutWidget from "@/components/Admin/Dashboard/AdminVoterTurnoutWidget";
import QuickActionsWidget from "@/components/Admin/Dashboard/QuickActionsWidget";
import LiveTallyWidget from "@/components/Admin/Dashboard/LiveTallyWidget";
import RecentActivityWidget from "@/components/Admin/Dashboard/RecentActivityWidget";
import AdminNotificationManager from "@/components/Admin/Dashboard/AdminNotificationManager"; // Notification manager widget

async function getAdminDashboardData() {
  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const apiUrl = new URL("/api/admin/dashboard-data", appUrl).toString();

  const cookieHeader = headers().get("cookie");
  const fetchOptions = {
    cache: "no-store",
    headers: {},
  };
  if (cookieHeader) {
    fetchOptions.headers["Cookie"] = cookieHeader;
  }

  try {
    const res = await fetch(apiUrl, fetchOptions);
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(
        "API Error fetching admin dashboard data:",
        res.status,
        errorData
      );
      return {
        error:
          errorData?.error ||
          `Failed to fetch dashboard data (Status: ${res.status})`,
      };
    }
    const data = await res.json();
    return { data };
  } catch (error) {
    console.error("Fetch Error getting admin dashboard data:", error);
    return {
      error: "Could not connect to the server to fetch dashboard data.",
    };
  }
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["SUPER_ADMIN", "MODERATOR", "AUDITOR"].includes(session.user.role)
  ) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger" role="alert">
          <h4>
            <i className="bi bi-x-circle-fill me-2"></i>Access Denied
          </h4>
          <p>
            You do not have permission to view this page. Please log in with an
            authorized administrator account.
          </p>
          <Link href="/admin-login" className="btn btn-primary">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  const { data: dashboardData, error } = await getAdminDashboardData();

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger" role="alert">
          <h4>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>Error
            Loading Dashboard
          </h4>
          <p>{error}</p>
          <p>Please try refreshing the page or contact support.</p>
        </div>
      </div>
    );
  }

  const activeElectionDetails = dashboardData?.activeElectionDetails || null;
  const userRole = session.user.role;
  const userCollege = session.user.college;

  return (
    <div className="container-fluid p-0">
      {activeElectionDetails ? (
        <>
          <div className="row g-4 mb-4 p-0">
            {" "}
            {/* Added p-0 for row padding */}
            {/* Overview Widget - Visible to all admins */}
            <div className="col-12 col-md-6 col-lg-4 d-flex">
              <OverviewWidget election={activeElectionDetails} />
            </div>
            {/* Voter Turnout Widget - Visible to all admins, internal logic handles scope */}
            <div className="col-12 col-md-6 col-lg-4 d-flex">
              <AdminVoterTurnoutWidget
                electionId={activeElectionDetails.id}
                eligibleVoters={
                  activeElectionDetails.voterTurnout.eligibleVoters
                }
                votesCastInScope={
                  activeElectionDetails.voterTurnout.votesCastInScope
                }
                turnoutPercentage={
                  activeElectionDetails.voterTurnout.turnoutPercentage
                }
                scopeType={activeElectionDetails.scope.type}
                college={activeElectionDetails.scope.college}
              />
            </div>
            {/* Quick Actions Widget - Visible to all admins, internal logic handles scope */}
            <div className="col-12 col-md-6 col-lg-4 d-flex">
              <QuickActionsWidget
                userRole={userRole}
                userCollege={userCollege}
                electionId={activeElectionDetails.id}
                electionStatus={activeElectionDetails.effectiveStatus}
              />
            </div>
          </div>

          <div className="row g-4 mb-4 p-0">
            {" "}
            {/* Added p-0 for row padding */}
            {/* Live Tally Widget (Conditional) - Visible to all admins, internal logic handles scope */}
            <div className="col-12 col-xl-8 d-flex">
              {["ONGOING", "ENDED"].includes(
                activeElectionDetails.effectiveStatus
              ) ? (
                <LiveTallyWidget
                  electionId={activeElectionDetails.id}
                  electionStatus={activeElectionDetails.effectiveStatus}
                  positionsResults={
                    activeElectionDetails.electionResults.positionsResults
                  }
                  userRole={userRole}
                  userCollege={userCollege}
                  generatedAt={activeElectionDetails.generatedAt}
                />
              ) : (
                <div className="card shadow-sm flex-grow-1 p-4 text-center text-muted">
                  <i className="bi bi-bar-chart-line display-4 mb-3"></i>
                  <h5 className="mb-0">No Live Results</h5>
                  <p className="small mb-0">
                    Results will be displayed here once an election is ongoing
                    or has concluded.
                  </p>
                </div>
              )}
            </div>
            {/* Recent Activity Widget - NOT for Moderators */}
            {userRole !== "MODERATOR" && (
              <div className="col-12 col-xl-4 d-flex">
                <RecentActivityWidget userRole={userRole} />
              </div>
            )}
          </div>

          {/* Admin Notification Manager - Only for Super Admin */}
          {userRole === "SUPER_ADMIN" && (
            <div className="p-0 col-12 d-flex">
              <AdminNotificationManager />
            </div>
          )}
        </>
      ) : (
        <div className="card shadow-sm p-0 text-center m-0">
          {" "}
          {/* Added mx-md-4 for centering/spacing */}
          <i className="bi bi-exclamation-circle-fill display-4 text-muted mb-3"></i>
          <h5 className="mb-3">No Election Data Available</h5>
          <p className="text-muted">
            There is currently no active, upcoming, or recently ended election
            to display on the dashboard.
          </p>
          {userRole === "SUPER_ADMIN" && (
            <Link
              href="/admin/election-settings"
              className="btn btn-primary mt-3"
            >
              <i className="bi bi-plus-circle me-2"></i>Create New Election
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
