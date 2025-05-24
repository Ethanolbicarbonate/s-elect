"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import NavigationPanel from "@/components/Layout/NavigationPanel";
import Link from "next/link";

export default function StudentLayout({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname(); // To get current path for breadcrumbs if needed

  const [showSidebar, setShowSidebar] = useState(false); // State for sidebar visibility on mobile

  // Effect to handle session loading and redirection
  useEffect(() => {
    if (status === "loading") return; // Do nothing while loading
    if (!session || session.user?.role !== "STUDENT") {
      console.log(
        "StudentLayout: No session or not a student, redirecting to /student-login"
      );
      redirect("/student-login"); // redirect is from next/navigation, works in client components
    }
  }, [session, status]);

  // Close sidebar when route changes (optional, good UX)
  useEffect(() => {
    setShowSidebar(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  if (status === "loading" || !session) {
    // You can return a loading spinner or a minimal layout here
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  let userName = session.user.email; // Default to email
  if (session.user.firstName) {
    if (session.user.lastName) {
      userName = `${session.user.firstName} ${session.user.lastName}`;
    } else {
      userName = session.user.firstName; // Fallback to only firstName if lastName is missing
    }
  }

  const userCollege = session.user.college || "N/A";

  // Determine current page name for breadcrumb (simple example)
  let currentPageName = "Dashboard";
  if (pathname.startsWith("/dashboard")) currentPageName = "Dashboard";
  else if (pathname.startsWith("/candidates")) currentPageName = "Candidates";
  else if (pathname.startsWith("/vote")) currentPageName = "Vote";
  else if (pathname.startsWith("/about-help")) currentPageName = "About/Help";
  else if (pathname.startsWith("/settings")) currentPageName = "Settings";
  // Add more else if for other top-level student pages

  return (
    <div className="d-flex vh-100">
      <NavigationPanel
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
      />

      <div
        className="flex-grow-1 d-flex flex-column transition-margin-lg"
        style={{
          paddingLeft: showSidebar ? "0" : "0",
          marginLeft: "0px",
        }}
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
            {/* Hamburger Menu for Mobile */}
            <button
              className="btn btn-icon d-lg-none me-2" // Hidden on large screens
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
            >
              <i className="bi bi-list fs-4"></i>
            </button>

            {/* Breadcrumb or Page Title */}
            <nav aria-label="breadcrumb" className="d-none d-md-block">
              {" "}
              {/* Hide breadcrumb on very small screens if needed */}
              <ol className="breadcrumb mb-0 d-flex align-items-center">
                <li className="breadcrumb-item">
                  <Link href="/dashboard" className="text-decoration-none">
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
            {/* Mobile Page Title (if breadcrumb is too much) */}
            <div className="d-md-none text-dark fw-thin">{currentPageName}</div>
          </div>

          <div className="d-flex align-items-center">
            <span className="me-2 text-dark d-none d-sm-inline">
              {userName}
            </span>{" "}
            {/* Hide username on xs screens if too crowded */}
            <span className="badge bg-warning text-dark p-2 fs-6 fw-medium">
              {userCollege}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className="flex-grow-1 p-4"
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
            margin-left: 260px !important; /* Sidebar width */
            padding-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
