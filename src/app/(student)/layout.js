"use client";

// --- MODIFIED: Added signOut and useRouter ---
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect, usePathname, useRouter } from "next/navigation";

// --- MODIFIED: Import the ConfirmationModal ---
import NavigationPanel from "@/components/Layout/NavigationPanel";
import Link from "next/link";
import BottomNavBar from "@/components/Layout/BottomNavBar";
import FloatingVoteButton from "@/components/UI/FloatingVoteButton";
import ConfirmationModal from "@/components/UI/ConfirmationModal"; // <-- NEW IMPORT

export default function StudentLayout({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter(); // <-- NEW: Initialize router for logout redirect

  const [electionDetails, setElectionDetails] = useState(null);
  
  // --- NEW: State to manage the logout confirmation modal ---
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "STUDENT") {
      redirect("/student-login");
    }
  }, [session, status]);
  
  useEffect(() => {
    if (status === "authenticated" && session.user?.role === "STUDENT") {
      fetch('/api/student/active-election-details')
        .then(res => res.ok ? res.json() : null)
        .then(data => setElectionDetails(data))
        .catch(err => console.error("Failed to fetch election details for layout:", err));
    }
  }, [status, session]);

  // --- NEW: Function to handle the logout action ---
  const handleLogout = async () => {
    await signOut({ redirect: false });
    setShowLogoutModal(false); // Close the modal
    router.push("/"); // Redirect to home page
  };

  if (status === "loading" || !session) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // ... (keep the userName, userCollege, and collegeColorMap logic as is) ...
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
    CAS: { bg: "bg-cas", text: "text-cas" }, CBM: { bg: "bg-cbm", text: "text-cbm" },
    COC: { bg: "bg-coc", text: "text-coc" }, COD: { bg: "bg-cod", text: "text-cod" },
    COE: { bg: "bg-coe", text: "text-coe" }, CICT: { bg: "bg-cict", text: "text-cict" },
    COL: { bg: "bg-col", text: "text-col" }, COM: { bg: "bg-com", text: "text-com" },
    CON: { bg: "bg-con", text: "text-con" }, PESCAR: { bg: "bg-pescar", text: "text-pescar" },
    "N/A": { bg: "bg-na", text: "text-na" },
  };
  const getCollegeBadgeClasses = (college) => {
    const colors = collegeColorMap[college] || collegeColorMap["N/A"];
    return `${colors.bg} ${colors.text}`;
  };
  let currentPageName = "Dashboard";
  if (pathname.startsWith("/dashboard")) currentPageName = "Dashboard";
  else if (pathname.startsWith("/election-details")) currentPageName = "Election Details";
  else if (pathname.startsWith("/vote")) currentPageName = "Vote";
  else if (pathname.startsWith("/about-help")) currentPageName = "About/Help";

  return (
    <div className="d-flex vh-100">
      <NavigationPanel />

      <div className="flex-grow-1 d-flex flex-column transition-margin-lg" style={{ marginLeft: "0px" }}>
        <header
          className="d-flex justify-content-between align-items-center p-3 bg-body sticky-top shadow-sm"
          style={{ height: "60px", borderBottom: "1px solid var(--bs-border-color)", zIndex: "100" }}
        >
          <div className="d-flex align-items-center">
            <nav aria-label="breadcrumb" className="d-none d-md-block">
              <ol className="breadcrumb mb-0 d-flex align-items-center">
                <li className="breadcrumb-item"><Link href="/dashboard" className="text-decoration-none"><i className="bi bi-house-door-fill text-body-secondary"></i></Link></li>
                <li className="breadcrumb-item active text-body-secondary text-body-secondary opacity-75" aria-current="page">{currentPageName}</li>
              </ol>
            </nav>
            <div className="d-md-none text-body-secondary fw-thin">{currentPageName}</div>
          </div>

          <div className="d-flex align-items-center">
            <span className="me-2 text-body-secondary d-none d-sm-inline">{userName}</span>
            <span className={`badge p-2 fs-6 fw-medium ${getCollegeBadgeClasses(userCollege)}`}>{userCollege}</span>
            
            <button
              className="btn btn-icon d-lg-none m-2 px-2 py-0 bg-danger" // Added background color
              onClick={() => setShowLogoutModal(true)}
              aria-label="Logout"
            >
              {/* Changed icon color from text-danger to text-white */}
              <i className="bi bi-box-arrow-right fs-5 text-white"></i>
            </button>

          </div>
        </header>

        <main className="flex-grow-1 p-4 bg-body-tertiary main-content-mobile-padding" style={{ backgroundImage: "var(--bg-grid-pattern)", backgroundSize: "6px 6px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
      
      <BottomNavBar />
      {electionDetails && (
        <FloatingVoteButton
          electionStatus={electionDetails.effectiveStatusForStudent}
          hasVoted={electionDetails.hasVoted}
          electionEndDate={electionDetails.effectiveEndDateForStudent}
          currentPath={pathname}
        />
      )}

      {/* --- NEW: Render the Confirmation Modal --- */}
      <ConfirmationModal
        show={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        bodyText="Are you sure you want to log out?"
        confirmButtonText="Logout"
        confirmButtonVariant="danger"
      />
      {/* --- END: Confirmation Modal --- */}
      
      <style jsx global>{`
        // --- DESKTOP SIDEBAR LOGIC (UNCHANGED) ---
        @media (min-width: 992px) {
          .transition-margin-lg {
            margin-left: 260px !important;
            padding-left: 0 !important;
          }
        }
        
        // --- NEW: BOTTOM NAVIGATION BAR STYLES ---
        .bottom-nav-mobile {
          display: none; // Hidden by default on desktop
        }

        @media (max-width: 991.98px) { // lg breakpoint
          // Push content up to avoid being covered by the nav bar
          .main-content-mobile-padding {
            padding-bottom: 85px !important; // 70px bar + 15px buffer
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
            padding: 0;
            margin: 0;
          }
          .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: #6c757d; // Bootstrap secondary
            font-size: 0.75rem;
            padding: 8px 0;
            flex-grow: 1;
          }
          .nav-item .bi {
            font-size: 1.5rem;
            margin-bottom: 2px;
          }
          .nav-item.active {
            color: var(--bs-primary); // Use Bootstrap primary color for active state
            font-weight: 500;
          }
        }

        // --- COLLEGE BADGE COLORS (UNCHANGED) ---
        .bg-cas { background-color: #ffe8a3; } .text-cas { color: #7c6b26; }
        .bg-cbm { background-color: #49796b; } .text-cbm { color: #d9f1ea; }
        .bg-coc { background-color: #7e4c4c; } .text-coc { color: #f5eded; }
        .bg-cod { background-color: #8675a9; } .text-cod { color: #ece6f4; }
        .bg-coe { background-color: #5c8db3; } .text-coe { color: #e6eff6; }
        .bg-cict { background-color: #e9a06f; } .text-cict { color: #4a3725; }
        .bg-col { background-color: #4a4a4a; } .text-col { color: #d6d6d6; }
        .bg-com { background-color: #f5c8d8; } .text-com { color: #6a3e4f; }
        .bg-con { background-color: #a689c0; } .text-con { color: #f2ecf8; }
        .bg-pescar { background-color: #7a86b6; } .text-pescar { color: #ebeef7; }
        .bg-na { background-color: #b0bec5; } .text-na { color: #263238; }
      `}</style>
    </div>
  );
}