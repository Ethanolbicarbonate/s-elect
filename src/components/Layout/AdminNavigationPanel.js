// File: .\components\Layout\AdminNavigationPanel.js

"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Simplified for desktop-only view. Mobile logic is now in AdminBottomNavBar.
export default function AdminNavigationPanel({ userRole, userCollege }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };
  
  // This logic remains to build the navigation list for the sidebar
  const getNavItemsForRole = (role, adminCollegeContext) => {
    let items = [];
    const entityManagementPath = "/admin/election-entities";

    items.push({ href: "/admin/dashboard", label: "Dashboard", icon: "bi-grid-fill" });

    if (role === "SUPER_ADMIN") {
      items.push(
        { href: "/admin/election-settings", label: "Election Settings", icon: "bi-calendar-event-fill" },
        { href: entityManagementPath, label: "Manage Election Entities", icon: "bi-stack" },
        { href: "/admin/results", label: "View All Results", icon: "bi-bar-chart-line-fill" },
        { href: "/admin/audit-log", label: "Audit Log", icon: "bi-pencil-square" }
      );
    } else if (role === "MODERATOR") {
      const commonPath = adminCollegeContext ? `${entityManagementPath}?scope=CSC&college=${adminCollegeContext}` : `${entityManagementPath}?scope=USC`;
      const label = adminCollegeContext ? `Manage ${adminCollegeContext} CSC Entities` : "Manage USC Entities";
      items.push(
        { href: commonPath, label: label, icon: "bi-diagram-3-fill" },
        { href: "/admin/results", label: "View Results", icon: "bi-bar-chart-line-fill" }
      );
    } else if (role === "AUDITOR") {
      items.push(
        { href: "/admin/audit-log", label: "Audit Log", icon: "bi-pencil-square" },
        { href: "/admin/results", label: "View All Results", icon: "bi-bar-chart-line-fill" }
      );
    }
    return items;
  };

  const navItems = getNavItemsForRole(userRole, userCollege);

  return (
    <>
      <nav
        className="d-none d-lg-flex flex-column vh-100 p-3 position-fixed top-0 left-0 bg-body gap-4"
        style={{ width: "260px", zIndex: 1000, boxShadow: "0 0 15px rgba(0,0,0,0.1)" }}
      >
        <Link href="/admin/dashboard" className="d-flex align-items-center mb-3 text-body text-decoration-none">
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
            <li className="nav-item fs-7 fw-medium" key={item.href}>
              <Link
                href={item.href}
                className={`nav-link d-flex align-items-center rounded-3 ${
                  pathname.startsWith(item.href) ? "active bg-primary" : "text-body-secondary"
                }`}
              >
                <i className={`bi ${item.icon} me-2 fs-5`}></i>
                {item.label}
              </Link>
              <hr className="border-1 border-secondary-subtle my-1 mx-3 p-0 opacity-100" />
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2 border-top border-secondary-subtle">
          <button
            onClick={handleLogout}
            className="nav-link text-danger d-flex align-items-center w-100 fs-7 fw-medium"
            style={{ background: "none", border: "none", textAlign: "left", padding: "0.5rem 0.75rem" }}
          >
            <i className="bi bi-door-closed-fill me-2 fs-5"></i>
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}