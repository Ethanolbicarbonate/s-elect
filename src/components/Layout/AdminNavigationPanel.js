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
  userCollege, // This is the admin's assigned college, if they are a College Moderator
}) {
  const [isOverlayVisible, setOverlayVisible] = useState(false);
  const [shouldRenderOverlay, setShouldRenderOverlay] = useState(false);

  useEffect(() => {
    if (showSidebar) {
      setShouldRenderOverlay(true);
      requestAnimationFrame(() => setOverlayVisible(true));
    } else {
      setOverlayVisible(false);
      setTimeout(() => setShouldRenderOverlay(false), 300);
    }
  }, [showSidebar]);

  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const getNavItemsForRole = (role, adminCollegeContext) => {
    let items = [];
    const entityManagementPath = "/admin/election-entities"; // Centralized path

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
          href: entityManagementPath, 
          label: "Manage Election Entities",
          icon: "bi-stack",
        },
        {
          href: "/admin/results",
          label: "View All Results",
          icon: "bi-bar-chart-line-fill",
        },
        {
          href: "/admin/audit-log",
          label: "Audit Log",
          icon: "bi-pencil-square",
        },
      );
    } else if (role === "MODERATOR") {
      if (adminCollegeContext === null || adminCollegeContext === undefined) {
        // USC Moderator
        items.push(
          {
            href: `${entityManagementPath}?scope=USC`, // USC Mod still needs specific scope
            label: "Manage USC Entities",
            icon: "bi-diagram-3-fill",
          },
          {
            href: "/admin/results?scope=USC",
            label: "View USC Results",
            icon: "bi-bar-chart-line-fill",
          }
        );
      } else if (typeof adminCollegeContext === "string") {
        // College Moderator
        items.push(
          {
            href: `${entityManagementPath}?scope=CSC&college=${adminCollegeContext}`, // College Mod needs specific scope
            label: `Manage ${adminCollegeContext} CSC Entities`,
            icon: "bi-diagram-2-fill",
          },
          {
            href: `/admin/results?scope=CSC&college=${adminCollegeContext}`,
            label: `View ${adminCollegeContext} Results`,
            icon: "bi-bar-chart-line-fill",
          }
        );
      } else {
        // Fallback for improperly configured Moderator
        console.warn(
          "Moderator has an invalid or undefined college value:",
          adminCollegeContext
        );
        items.push({
          href: entityManagementPath, // Generic link, page should handle this gracefully
          label: "Manage Entities (Scope Error)",
          icon: "bi-question-circle",
        });
      }
    } else if (role === "AUDITOR") {
      // Auditor links remain the same
      items.push(
        {
          href: "/admin/audit-log",
          label: "Audit Log",
          icon: "bi-pencil-square",
        },
        {
          href: "/admin/results",
          label: "View All Results",
          icon: "bi-bar-chart-line-fill",
        }
      );
    }
    return items;
  };

  const navItems = getNavItemsForRole(userRole, userCollege);

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

      <nav
        className={`d-flex flex-column vh-100 p-3 position-fixed top-0 left-0 transition-transform bg-white gap-4 ${
          showSidebar ? "transform-none" : "-translate-x-full"
        } d-lg-transform-none`}
        style={{
          width: "260px",
          zIndex: 1000,
          boxShadow: "0 0 15px rgba(0,0,0,0.1)",
        }} // Added a subtle shadow
      >
        <div className="d-flex justify-content-between align-items-center d-lg-none mb-3">
          <div style={{ width: "150px" }}>
            {" "}
            {/* Constrained width for mobile logo */}
            <Image
              src="/assets/logotext.svg"
              alt="sELECT"
              width={150} // Adjusted for smaller space
              height={60} // Adjusted for smaller space
              className="w-100 h-auto object-fit-contain logo-color" // h-auto for aspect ratio
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
          {uniqueNavItems.map((item) => (
            <li
              className="nav-item fs-7 fw-medium"
              key={item.href + item.label}
            >
              <Link
                href={item.href}
                className={`nav-link d-flex align-items-center rounded-3 ${
                  // Active check needs to be robust for query params
                  // Check if the current pathname starts with the item's base href
                  // AND (it's an exact match OR the next char is '/' or '?')
                  // AND if query params exist, consider them for stricter active state if needed
                  pathname === item.href ||
                  (pathname.startsWith(item.href) &&
                    (item.href.endsWith("?") ||
                      pathname.charAt(item.href.length) === "?" ||
                      pathname.charAt(item.href.length) === "/"))
                    ? "active bg-primary"
                    : "text-secondary"
                }`}
                onClick={() => {
                  if (showSidebar) toggleSidebar();
                }}
              >
                <i className={`bi ${item.icon} me-2 fs-5`}></i>{" "}
                {/* Slightly larger icon */}
                {item.label}
                {item.badge && (
                  <span className="badge bg-warning text-dark ms-auto">
                    {item.badge}
                  </span>
                )}
              </Link>
              {/* Optional: remove hr if gap-1 is enough separation */}
              <hr className="border-1 border-light my-1 mx-3 p-0 opacity-100" />
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2 border-top border-light">
          {" "}
          {/* Footer links push to bottom */}
          <button
            onClick={handleLogout}
            className="nav-link text-danger d-flex align-items-center w-100 fs-7 fw-medium"
            style={{
              background: "none",
              border: "none",
              textAlign: "left",
              padding: "0.5rem 0.75rem",
            }}
          >
            <i className="bi bi-door-closed-fill me-2 fs-5"></i>
            Logout
          </button>
        </div>
      </nav>
      {/* Style tag remains the same */}
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
          .d-lg-transform-none {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}
