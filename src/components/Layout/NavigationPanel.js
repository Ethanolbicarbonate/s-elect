// File: .\components\Layout\NavigationPanel.js

"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// This component is now a desktop-only sidebar.
// All mobile-related logic has been removed.
export default function NavigationPanel() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "bi-grid-fill" },
    { href: "/election-details", label: "Election Details", icon: "bi-collection-fill" },
    { href: "/vote", label: "Vote", icon: "bi-check-square-fill" },
    { href: "/about-help", label: "About/Help", icon: "bi-info-circle-fill" },
  ];

  return (
    <nav
      className="d-none d-lg-flex flex-column vh-100 p-3 position-fixed top-0 left-0 bg-white gap-4"
      style={{
        width: "260px",
        zIndex: 1000,
        boxShadow: "0 0 15px rgba(0,0,0,0.1)",
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="d-flex align-items-center mb-3 text-dark text-decoration-none"
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
      
      {/* Navigation Links */}
      <ul className="nav nav-pills flex-column mb-auto gap-1">
        {navItems.map((item) => (
          <li className="nav-item" key={item.label}>
            <Link
              href={item.href}
              className={`nav-link d-flex align-items-center rounded-3 ${
                pathname.startsWith(item.href) ? "active text-white" : "text-secondary"
              }`}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              <i className={`bi ${item.icon} me-2`}></i>
              {item.label}
            </Link>
            <hr className="border-1 border-light my-2 mx-3 p-0 opacity-100" />
          </li>
        ))}
      </ul>
      
      {/* Logout Button */}
      <div className="px-3 py-1 border-top border-light">
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
  );
}