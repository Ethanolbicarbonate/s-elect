// src/components/Layout/AdminNavigationPanel.js
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminNavigationPanel({
  showSidebar,
  toggleSidebar,
  userRole,
  userCollege,
}) {
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [shouldRenderOverlay, setShouldRenderOverlay] = useState(false);

  useEffect(() => {
    if (showSidebar) {
      setShouldRenderOverlay(true);
      requestAnimationFrame(() => setOverlayVisible(true)); // trigger transition
    } else {
      setOverlayVisible(false);
      setTimeout(() => setShouldRenderOverlay(false), 300); // match transition duration
    }
  }, [showSidebar]);

  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  // --- REFINED NAVIGATION ITEMS LOGIC ---
  const getNavItemsForRole = (role, college) => {
    let items = [];

    // All admin roles see Dashboard
    items.push({
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: "bi-grid-fill",
    });

    if (role === "SUPER_ADMIN") {
      items.push(
        {
          href: "/admin/election-settings",
          label: "Election Settings",
          icon: "bi-calendar-event-fill",
        },
        {
          href: "/admin/candidates?scope=usc", // Use 'scope' query param for USC Candidates
          label: "Manage USC Candidates",
          icon: "bi-file-person-fill",
        },
        {
          href: "/admin/candidates?scope=csc", // Use 'scope' query param for CSC Candidates (Super Admin can see all CSCs)
          label: "Manage All CSC Candidates", // More accurate label for SA
          icon: "bi-file-person",
        },
        {
          href: "/admin/results",
          label: "View All Results",
          icon: "bi-bar-chart-line-fill",
        },
        {
          href: "/admin/audit-log",
          label: "Audit Log",
          icon: "bi bi-pencil-square",
        },
        {
          href: "/admin/feedback",
          label: "User Feedback",
          icon: "bi-chat-left-dots-fill",
        },
        {
          href: "/admin/sessions",
          label: "Active Sessions",
          icon: "bi-person-bounding-box",
        }
      );
    } else if (role === "MODERATOR") {
      if (college === null) {
        // USC Moderator
        items.push(
          {
            href: "/admin/candidates?scope=usc", // USC Moderator manages USC candidates
            label: "Manage USC Candidates",
            icon: "bi-people-fill",
          },
          // USC Mod might also see USC results only - you can add a separate link if needed
          {
            href: "/admin/results?scope=usc", // Example: filter results for USC only
            label: "View USC Results",
            icon: "bi-bar-chart-line-fill",
          }
        );
      } else if (typeof college === "string") {
        items.push(
          {
            href: `/admin/candidates?scope=csc&college=${college}`,
            label: `Manage ${college} CSC Candidates`, // Now 'college' should be a string
            icon: "bi-person-video3",
          },
          {
            href: `/admin/results?scope=csc&college=${college}`,
            label: `View ${college} Results`,
            icon: "bi-bar-chart-line-fill",
          }
        );
      } else {
        // Fallback for MODERATOR if 'college' is unexpectedly undefined/invalid
        console.warn(
          "Moderator has an invalid or undefined college value:",
          college
        );
        items.push({
          href: "/admin/candidates", // Default to a general candidates page
          label: "Manage Candidates (Scope Error)",
          icon: "bi-question-circle",
        });
      }
    } else if (role === "AUDITOR") {
      items.push(
        {
          href: "/admin/audit-log",
          label: "Audit Log",
          icon: "bi bi-pencil-square",
        },
        {
          href: "/admin/results", // Auditor sees all results (page enforces read-only)
          label: "View All Results",
          icon: "bi-bar-chart-line-fill",
        }
      );
    }
    return items;
  };

  const navItems = getNavItemsForRole(userRole, userCollege);
  // --- END REFINED NAVIGATION ITEMS LOGIC ---

  // Remove duplicates just in case (e.g., if a role-specific item duplicates a base item)
  // This filter is important if getNavItemsForRole might produce overlaps, though current logic aims to prevent.
  const uniqueNavItems = navItems.filter(
    (item, index, self) =>
      index ===
      self.findIndex((t) => t.href === item.href && t.label === item.label)
  );

  return (
    <>
      {shouldRenderOverlay && (
        <div
          className={`mobile-overlay ${isOverlayVisible ? "visible" : ""}`}
          onClick={toggleSidebar}
        />
      )}
      {showSidebar && (
        <div className="mobile-overlay" onClick={toggleSidebar}></div>
      )}

      <nav
        className={`d-flex flex-column vh-100 p-3 position-fixed top-0 left-0 transition-transform bg-white gap-4 ${
          showSidebar ? "transform-none" : "-translate-x-full" // Slide in/out
        } d-lg-transform-none`} // Always visible on lg screens
        style={{ width: "260px", zIndex: 1000 }}
      >
        {/* Mobile Close Button (Inside Sidebar) */}
        <div className="d-flex justify-content-between align-items-center d-lg-none mb-3">
          <div className="w-100">
            <Image
              src="/assets/logotext.svg"
              alt="sELECT"
              width={500}
              height={200}
              className="w-100 h-100 object-fit-contain logo-color"
            />
          </div>
          <button
            className="btn btn-icon text-dark"
            onClick={toggleSidebar}
            aria-label="Close navigation"
          >
            <i className="bi bi-x-lg fs-4"></i>
          </button>
        </div>

        <Link
          href="/admin/dashboard"
          className="d-none d-lg-flex align-items-center mb-3 mb-md-0 me-md-auto text-dark text-decoration-none"
        >
          <div className="w-100">
            <Image
              src="/assets/logotext.svg"
              alt="sELECT"
              width={500}
              height={200}
              className="w-100 h-100 object-fit-contain logo-color"
            />
          </div>
        </Link>

        <ul className="nav nav-pills flex-column mb-auto gap-1">
          {uniqueNavItems.map(
            (
              item // Use uniqueNavItems here
            ) => (
              <li
                className="nav-item fs-7 fw-medium"
                key={item.href + item.label}
              >
                <Link
                  href={item.href}
                  className={`nav-link d-flex align-items-center rounded-3 ${
                    // More robust active check: handles query params
                    pathname.startsWith(item.href) &&
                    (pathname.length === item.href.length ||
                      pathname[item.href.length] === "?" ||
                      pathname[item.href.length] === "/")
                      ? "active bg-primary" // Use bg-primary for active link in dark sidebar
                      : "text-secondary" // Inactive color
                  }`}
                  onClick={() => {
                    if (showSidebar) toggleSidebar();
                  }}
                >
                  <i className={`bi ${item.icon} me-2`}></i>
                  {item.label}
                  {item.badge && (
                    <span className="badge bg-warning text-dark ms-auto">
                      {item.badge}
                    </span>
                  )}
                </Link>
                <hr className="border-1 border-light my-2 mx-3 p-0 opacity-100" />
              </li>
            )
          )}
        </ul>

        <div className="px-3 py-1">
          <button
            onClick={handleLogout}
            className="nav-link text-danger d-flex align-items-center w-100"
            style={{ background: "none", border: "none", textAlign: "left" }}
          >
            <i className="bi bi-door-closed-fill me-2"></i>
            Logout
          </button>
        </div>
      </nav>
      <style jsx global>{`
        .transition-transform {
          transition: transform 0.3s ease-in-out;
        }
        .-translate-x-full {
          transform: translateX(-100%);
        }
        .transform-none {
          transform: translateX(0);
        }
        @media (min-width: 992px) {
          /* lg breakpoint in Bootstrap */
          .d-lg-transform-none {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}
