"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import AdminNavigationPanel from "@/components/Layout/AdminNavigationPanel";
import Link from "next/link";
import Image from "next/image";

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession(); // Get session data
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);

  const allowedAdminRoles = ["SUPER_ADMIN", "AUDITOR", "MODERATOR"];

  useEffect(() => {
    if (status === "loading") return; // Do nothing while session is loading

    // If session is null/undefined or user is missing, or role is not allowed, redirect
    if (
      !session ||
      !session.user ||
      !allowedAdminRoles.includes(session.user.role)
    ) {
      console.log(
        "AdminLayout: No session or not an authorized admin, redirecting to /admin-login"
      );
      redirect("/admin-login"); // Use Next.js redirect
    }
  }, [session, status, allowedAdminRoles]); // Depend on session and status

  // Effect to close sidebar when route changes on mobile
  useEffect(() => {
    setShowSidebar(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  if (status === "loading" || !session || !session.user) {
    // Added !session || !session.user check
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  // --- END IMPORTANT FIX ---

  // At this point, we can safely assume session and session.user exist and are authorized.
  const adminName = session.user.firstName
    ? `${session.user.firstName} ${session.user.lastName || ""}`.trim()
    : session.user.email;
  const adminRole = session.user.role;
  const adminCollege = session.user.college;

  // Determine current page name for breadcrumb
  let currentPageName = "Admin Dashboard";
  if (pathname.startsWith("/admin/dashboard"))
    currentPageName = "Admin Dashboard";
  else if (pathname.startsWith("/admin/election-settings"))
    currentPageName = "Election Settings";
  else if (pathname.startsWith("/admin/candidates")) {
    const urlParams = new URLSearchParams(pathname.split("?")[1]);
    const scope = urlParams.get("scope");
    const collegeParam = urlParams.get("college");
    if (scope === "usc") currentPageName = "Manage USC Candidates";
    else if (scope === "csc" && collegeParam)
      currentPageName = `Manage ${collegeParam} CSC Candidates`;
    else currentPageName = "Candidate Management"; // Generic if no scope or general page
  } else if (pathname.startsWith("/admin/audit-log"))
    currentPageName = "Audit Log";
  else if (pathname.startsWith("/admin/results"))
    currentPageName = "Election Results";
  return (
    <div className="d-flex vh-100">
      <AdminNavigationPanel
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        userRole={adminRole}
        userCollege={adminCollege}
      />

      <div
        className="flex-grow-1 d-flex flex-column transition-margin-lg"
        style={{ marginLeft: "0px" }} // Default no margin, style below applies for lg
      >
        {/* Top Bar */}
        <header
          className="d-flex justify-content-between align-items-center p-3 bg-white sticky-top shadow-sm"
          style={{
            height: "60px",
            borderBottom: "1px solid #dee2e6",
            zIndex: "100",
          }}
        >
          <div className="d-flex align-items-center">
            <button
              className="btn btn-icon d-lg-none me-2"
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
            >
              <i className="bi bi-list fs-4"></i>
            </button>
            <nav aria-label="breadcrumb" className="d-none d-md-block">
              <ol className="breadcrumb mb-0 d-flex align-items-center">
                <li className="breadcrumb-item">
                  <Link
                    href="/admin/dashboard"
                    className="text-decoration-none"
                  >
                    <i className="bi bi-house-door-fill text-secondary"></i>
                  </Link>
                </li>
                <li
                  className="breadcrumb-item active text-dark text-secondary opacity-75"
                  aria-current="page"
                >
                  {currentPageName}
                </li>
              </ol>
            </nav>
            <div className="d-md-none text-dark fw-normal">
              {currentPageName}
            </div>
          </div>

          <div className="d-flex align-items-center">
            <div className="px-3">{adminName}</div>
            <span
              className={`fw-medium fs-6 badge p-2 ${
                adminRole === "SUPER_ADMIN"
                  ? "bg-danger text-white"
                  : adminRole === "MODERATOR"
                  ? "bg-info text-white"
                  : "bg-secondary text-white"
              }`}
            >
              {adminRole} {adminCollege ? `(${adminCollege})` : ""}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className="flex-grow-1 p-4 bg-light"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgba(116, 204, 248, 0.35) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
      <style jsx global>{`
        @media (min-width: 992px) {
          /* lg breakpoint */
          .transition-margin-lg {
            margin-left: 260px !important; /* Admin Sidebar width */
          }
        }
      `}</style>
    </div>
  );
}
