import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import ElectionViewTabs from "@/components/StudentView/ElectionViewTabs";
import Link from "next/link";
import FadeInSection from "@/components/UI/FadeInSection";

// Helper function to format dates
function formatDateRange(startDateStr, endDateStr) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Check if dates are on the same day
  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()
  ) {
    return `${startDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} (${startDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} - ${endDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })})`;
  } else {
    return `${startDate.toLocaleString(
      undefined,
      options
    )} - ${endDate.toLocaleString(undefined, options)}`;
  }
}

async function getActiveElectionDetails() {
  const appUrl =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const apiUrl = new URL(
    "/api/student/active-election-details",
    appUrl
  ).toString();

  const headersList = await headers();
  const cookieHeader = headersList.get("cookie");
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
        "API Error fetching active election:",
        res.status,
        errorData
      );
      return {
        error:
          errorData?.error ||
          `Failed to fetch election details (Status: ${res.status})`,
      };
    }
    const data = await res.json();
    return { data };
  } catch (error) {
    console.error("Fetch Error getting active election:", error);
    return {
      error: "Could not connect to the server to fetch election details.",
    };
  }
}

export default async function ElectionDetailsPage() {
  const session = await getServerSession(authOptions);
  const studentCollegeName = session?.user?.college || "N/A";

  const { data: electionDetails, error } = await getActiveElectionDetails();

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger" role="alert">
          <h4>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>Error
            Loading Election Information
          </h4>
          <p>{error}</p>
          <p>
            Please try refreshing the page or contact support if the issue
            persists.
          </p>
        </div>
      </div>
    );
  }

  if (!electionDetails) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm">
          <div className="card-body p-5">
            <i className="bi bi-calendar-x fs-1 text-muted mb-3"></i>
            <h4 className="card-title">No Active or Upcoming Election</h4>
            <p className="card-text text-muted">
              There are currently no active or upcoming elections scheduled.
              Please check back later or visit your student dashboard for any
              announcements.
            </p>
            <Link href="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for tabs
  const uscData = {
    positions: electionDetails.uscPositions || [],
    partylists: electionDetails.uscPartylists || [],
    candidates: electionDetails.uscCandidates || [],
  };
  const cscData = {
    positions: electionDetails.cscPositions || [],
    partylists: electionDetails.cscPartylists || [],
    candidates: electionDetails.cscCandidates || [],
  };

  return (
    <div className="container-fluid m-0 p-0">
      <div className="card shadow-sm mb-4 rounded-4">
        <div className="card-header bg-primary text-white rounded-top-4 border-bottom-0">
          <h2 className="mb-0 h4">{electionDetails.name}</h2>
        </div>
        <div className="card-body">
          <p className="card-text text-secondary">
            Status:
            <span
              className={`ms-2 fw-normal badge bg-${
                electionDetails.effectiveStatusForStudent === "ONGOING"
                  ? "success"
                  : electionDetails.effectiveStatusForStudent === "UPCOMING"
                  ? "info"
                  : "secondary"
              }`}
            >
              {electionDetails.effectiveStatusForStudent?.replace("_", " ")}
            </span>
          </p>
          <p className="card-text text-secondary">
            Period:{" "}
            {formatDateRange(
              electionDetails.startDate,
              electionDetails.effectiveEndDateForStudent
            )}
          </p>
          {electionDetails.description && (
            <>
              <h5 className="mt-3 text-secondary fs-6 fw-normal">Description:</h5>
              <p
                className="card-text fst-italic text-muted fs-7 opacity-75 px-2"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {electionDetails.description}
              </p>
            </>
          )}
        </div>
      </div>

      <ElectionViewTabs
        uscData={uscData}
        cscData={cscData}
        studentCollegeName={studentCollegeName}
        electionStatus={electionDetails.effectiveStatusForStudent}
      />
    </div>
  );
}
