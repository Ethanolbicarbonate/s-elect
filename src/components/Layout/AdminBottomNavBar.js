// File: .\components\Layout\AdminBottomNavBar.js

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminBottomNavBar({ userRole, userCollege }) {
  const pathname = usePathname();

  // This logic is adapted from your AdminNavigationPanel
  const getNavItemsForRole = (role, adminCollegeContext) => {
    let items = [];
    const entityPath = "/admin/election-entities";

    items.push({ href: "/admin/dashboard", label: "Dashboard", icon: "bi-grid-fill" });

    if (role === "SUPER_ADMIN") {
      items.push(
        { href: "/admin/election-settings", label: "Settings", icon: "bi-calendar-event-fill" },
        { href: entityPath, label: "Entities", icon: "bi-stack" },
        { href: "/admin/results", label: "Results", icon: "bi-bar-chart-line-fill" },
        { href: "/admin/audit-log", label: "Audit", icon: "bi-pencil-square" }
      );
    } else if (role === "MODERATOR") {
      const scopePath = adminCollegeContext ? `${entityPath}?scope=CSC&college=${adminCollegeContext}` : `${entityPath}?scope=USC`;
      items.push(
        { href: scopePath, label: "Entities", icon: "bi-stack" },
        { href: "/admin/results", label: "Results", icon: "bi-bar-chart-line-fill" }
      );
    } else if (role === "AUDITOR") {
      items.push(
        { href: "/admin/results", label: "Results", icon: "bi-bar-chart-line-fill" },
        { href: "/admin/audit-log", label: "Audit", icon: "bi-pencil-square" }
      );
    }
    // Limit to 5 items for a clean bottom bar, or adjust layout
    return items.slice(0, 5);
  };

  const navItems = getNavItemsForRole(userRole, userCollege);

  return (
    <nav className="bottom-nav-mobile">
      <div className="nav-list">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}>
            <i className={`bi ${item.icon}`}></i>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}