// File: .\app\admin\layout.js

"use client";

// --- MODIFIED: Added signOut ---
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect, usePathname, useRouter } from "next/navigation"; // Added useRouter

// --- MODIFIED: Import ConfirmationModal ---
import AdminNavigationPanel from "@/components/Layout/AdminNavigationPanel";
import Link from "next/link";
import Image from "next/image";
import AdminBottomNavBar from "@/components/Layout/AdminBottomNavBar";
import ConfirmationModal from "@/components/UI/ConfirmationModal"; // <-- NEW IMPORT

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter(); // <-- NEW: Initialize router for logout

  // --- NEW: State to manage the logout confirmation modal ---
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const allowedAdminRoles = ["SUPER_ADMIN", "AUDITOR", "MODERATOR"];

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !session.user || !allowedAdminRoles.includes(session.user.role)) {
      redirect("/admin-login");
    }
  }, [session, status, allowedAdminRoles]);

  // --- NEW: Function to handle the logout action ---
  const handleLogout = async () => {
    await signOut({ redirect: false });
    setShowLogoutModal(false); // Close the modal
    router.push("/"); // Redirect to home page
  };

  if (status === "loading" || !session || !session.user) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

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
      <AdminNavigationPanel userRole={adminRole} userCollege={adminCollege} />

      <div className="flex-grow-1 d-flex flex-column transition-margin-lg" style={{ marginLeft: "0px" }}>
        <header
          className="d-flex justify-content-between align-items-center p-3 bg-body sticky-top shadow-sm"
          style={{ height: "60px", borderBottom: "1px solid var(--bs-border-color)", zIndex: "100" }}
        >
          <div className="d-flex align-items-center">
            <nav aria-label="breadcrumb" className="d-none d-md-block">
              <ol className="breadcrumb mb-0 d-flex align-items-center">
                <li className="breadcrumb-item"><Link href="/admin/dashboard" className="text-decoration-none"><i className="bi bi-house-door-fill text-body-secondary"></i></Link></li>
                <li className="breadcrumb-item active text-body text-body-secondary opacity-75" aria-current="page">{currentPageName}</li>
              </ol>
            </nav>
            <div className="d-md-none text-body fw-normal">{currentPageName}</div>
          </div>
          <div className="d-flex align-items-center">
            <div className="px-3 d-none d-md-block">{adminName}</div>
            <span
              className={`fw-medium fs-6 badge p-2 ${
                adminRole === "SUPER_ADMIN" ? "bg-danger text-white" : adminRole === "MODERATOR" ? "bg-info text-white" : "bg-secondary text-white"
              }`}
            >
              {adminRole} {adminCollege ? `(${adminCollege})` : ""}
            </span>

            {/* --- NEW: Mobile-only Logout Button with your specified style --- */}
            <button
              className="btn btn-icon d-lg-none m-2 px-2 py-0 bg-danger"
              onClick={() => setShowLogoutModal(true)}
              aria-label="Logout"
            >
              <i className="bi bi-box-arrow-right fs-5 text-white"></i>
            </button>
            {/* --- END: Mobile-only Logout Button --- */}

          </div>
        </header>

        <main
          className="flex-grow-1 p-4 bg-body-tertiary main-content-mobile-padding"
          style={{
            backgroundImage: "var(--bg-grid-pattern)",
            backgroundSize: "6px 6px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>

      <AdminBottomNavBar userRole={adminRole} userCollege={adminCollege} />
      
      {/* --- NEW: Render the Confirmation Modal --- */}
      <ConfirmationModal
        show={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        bodyText="Are you sure you want to log out from the admin panel?"
        confirmButtonText="Logout"
        confirmButtonVariant="danger"
      />
      {/* --- END: Confirmation Modal --- */}

      <style jsx global>{`
        // --- DESKTOP SIDEBAR LOGIC (UNCHANGED) ---
        @media (min-width: 992px) {
          .transition-margin-lg {
            margin-left: 260px !important;
          }
        }
        
        // --- NEW: BOTTOM NAVIGATION BAR STYLES ---
        .bottom-nav-mobile {
          display: none;
        }

        @media (max-width: 991.98px) {
          .main-content-mobile-padding {
            padding-bottom: 85px !important;
          }

          .bottom-nav-mobile {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 70px;
            background-color: var(--bs-body-bg);
            box-shadow: var(--nav-shadow);
            z-index: 1030;
          }
          .nav-list {
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 100%;
          }
          .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: #6c757d;
            font-size: 0.7rem; // Slightly smaller text for more items
            padding: 8px 4px; // Adjust padding
            flex-grow: 1;
            text-align: center;
          }
          .nav-item .bi {
            font-size: 1.4rem;
            margin-bottom: 2px;
          }
          .nav-item.active {
            color: var(--bs-primary);
            font-weight: 500;
          }
        }
      `}</style>
    </div>
  );
}