// File: .\components\Layout\BottomNavBar.js

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "bi-grid-fill" },
    { href: "/election-details", label: "Details", icon: "bi-collection-fill" },
    { href: "/vote", label: "Vote", icon: "bi-check-square-fill" },
    { href: "/about-help", label: "About", icon: "bi-info-circle-fill" },
  ];

  return (
    <nav className="bottom-nav-mobile">
      <div className="nav-list">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
            <i className={`bi ${item.icon}`}></i>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}