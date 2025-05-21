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

  const baseNavItems = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: "bi-speedometer2",
      roles: ["SUPER_ADMIN", "MODERATOR", "AUDITOR"],
    },
  ];

  const superAdminItems = [
    {
      href: "/admin/election-settings",
      label: "Election Settings",
      icon: "bi-calendar-event-fill",
      roles: ["SUPER_ADMIN"],
    },
    {
      href: "/admin/candidates",
      label: "Manage Candidates",
      icon: "bi-people-fill",
      roles: ["SUPER_ADMIN"],
    }, // Super Admin sees all
    {
      href: "/admin/results",
      label: "View Results",
      icon: "bi-bar-chart-line-fill",
      roles: ["SUPER_ADMIN"],
    },
    {
      href: "/admin/audit-log",
      label: "Audit Log",
      icon: "bi-journal-text",
      roles: ["SUPER_ADMIN"],
    },
    {
      href: "/admin/feedback",
      label: "User Feedback",
      icon: "bi-chat-left-dots-fill",
      roles: ["SUPER_ADMIN"],
    },
    {
      href: "/admin/sessions",
      label: "Active Sessions",
      icon: "bi-person-bounding-box",
      roles: ["SUPER_ADMIN"],
    },
  ];

  const moderatorItems = [
    {
      href: "/admin/candidates",
      label: "Manage Candidates",
      icon: "bi-people-fill",
      roles: ["MODERATOR"],
    },
    // Moderators might also need to see results for their college, to be implemented on results page
    {
      href: "/admin/results",
      label: "View Results",
      icon: "bi-bar-chart-line-fill",
      roles: ["MODERATOR"],
    },
  ];

  const auditorItems = [
    {
      href: "/admin/audit-log",
      label: "Audit Log",
      icon: "bi-journal-text",
      roles: ["AUDITOR"],
    },
    {
      href: "/admin/results",
      label: "View Results",
      icon: "bi-bar-chart-line-fill",
      roles: ["AUDITOR"],
    },
  ];

  let navItems = [...baseNavItems];
  if (userRole === "SUPER_ADMIN") {
    navItems = [...navItems, ...superAdminItems];
  } else if (userRole === "MODERATOR") {
    navItems = [...navItems, ...moderatorItems];
  } else if (userRole === "AUDITOR") {
    navItems = [...navItems, ...auditorItems];
  }
  // Remove duplicates by href if any (e.g. if base and role-specific items overlap)
  navItems = navItems.filter(
    (item, index, self) => index === self.findIndex((t) => t.href === item.href)
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
          {navItems.map((item) => (
            <li className="nav-item" key={item.label}>
              <Link
                href={item.href}
                className={`nav-link d-flex align-items-center ${
                  pathname === item.href ||
                  (item.href === "/admin/dashboard" &&
                    pathname.startsWith("/admin/dashboard"))
                    ? "active text-white"
                    : "text-secondary"
                }`}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => {
                  if (showSidebar && toggleSidebar) toggleSidebar();
                }} // Close sidebar on nav item click on mobile
              >
                <i className={`bi ${item.icon} me-2`}></i>
                {item.label}
                {item.badge && (
                  <span className="badge bg-warning text-dark ms-auto">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
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
