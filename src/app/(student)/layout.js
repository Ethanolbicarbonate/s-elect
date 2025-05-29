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

  let userName = session.user.email || "Guest";
  if (session.user.firstName) {
    if (session.user.lastName) {
      userName = `${session.user.firstName} ${session.user.lastName}`;
    } else {
      userName = session.user.firstName;
    }
  }

  const userCollege = session.user.college || "N/A";

  const collegeColorMap = {
    CAS: { bg: "bg-cas", text: "text-cas" },
    CBM: { bg: "bg-cbm", text: "text-cbm" },
    COC: { bg: "bg-coc", text: "text-coc" },
    COD: { bg: "bg-cod", text: "text-cod" },
    COE: { bg: "bg-coe", text: "text-coe" },
    CICT: { bg: "bg-cict", text: "text-cict" },
    COL: { bg: "bg-col", text: "text-col" },
    COM: { bg: "bg-com", text: "text-com" },
    CON: { bg: "bg-con", text: "text-con" },
    PESCAR: { bg: "bg-pescar", text: "text-pescar" },
    "N/A": { bg: "bg-na", text: "text-na" },
  };
  const getCollegeBadgeClasses = (college) => {
    const colors = collegeColorMap[college] || collegeColorMap["N/A"];
    return `${colors.bg} ${colors.text}`;
  };

  // Determine current page name for breadcrumb (simple example)
  let currentPageName = "Dashboard";
  if (pathname.startsWith("/dashboard")) currentPageName = "Dashboard";
  else if (pathname.startsWith("/election-details"))
    currentPageName = "Election Details";
  else if (pathname.startsWith("/vote")) currentPageName = "Vote";
  else if (pathname.startsWith("/about-help")) currentPageName = "About/Help";
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
            <span
              className={`badge p-2 fs-6 fw-medium ${getCollegeBadgeClasses(
                userCollege
              )}`}
            >
              {userCollege}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className="flex-grow-1 p-4 bg-light"
          style={{
            backgroundImage:
              "radial-gradient(circle,rgba(116, 204, 248, 0.2) 1px, transparent 1px)",
            backgroundSize: "6px 6px",
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
        .bg-cas {
          background-color: #ffe8a3;
        }
        .text-cas {
          color: #7c6b26;
        }

        .bg-cbm {
          background-color: #49796b;
        }
        .text-cbm {
          color: #d9f1ea;
        }

        .bg-coc {
          background-color: #7e4c4c;
        }
        .text-coc {
          color: #f5eded;
        }

        .bg-cod {
          background-color: #8675a9;
        }
        .text-cod {
          color: #ece6f4;
        }

        .bg-coe {
          background-color: #5c8db3;
        }
        .text-coe {
          color: #e6eff6;
        }

        .bg-cict {
          background-color: #e9a06f;
        }
        .text-cict {
          color: #4a3725;
        }

        .bg-col {
          background-color: #4a4a4a;
        }
        .text-col {
          color: #d6d6d6;
        }

        .bg-com {
          background-color: #f5c8d8;
        }
        .text-com {
          color: #6a3e4f;
        }

        .bg-con {
          background-color: #a689c0;
        }
        .text-con {
          color: #f2ecf8;
        }

        .bg-pescar {
          background-color: #7a86b6;
        }
        .text-pescar {
          color: #ebeef7;
        }

        .bg-na {
          background-color: #b0bec5;
        }
        .text-na {
          color: #263238;
        }
      `}</style>
    </div>
  );
}
