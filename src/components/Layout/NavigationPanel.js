// src/components/Layout/NavigationPanel.js
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function NavigationPanel({ showSidebar, toggleSidebar }) {
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

  // Added props
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "bi-grid-fill" },
    { href: "/election-details", label: "Election Details", icon: "bi bi-collection-fill" },
    { href: "/vote", label: "Vote", icon: "bi bi-check-square-fill" },
    { href: "/about-help", label: "About/Help", icon: "bi-info-circle-fill" },
    { href: "/settings", label: "Settings", icon: "bi-gear-fill" },
  ];

  return (
    <>
      {/* Overlay for mobile when sidebar is open (optional, but good UX) */}
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

        {/* Desktop Logo (hidden on mobile if close button is preferred) */}
        <Link
          href="/dashboard"
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
                className={`nav-link d-flex align-items-center rounded-3 ${
                  pathname === item.href ||
                  (item.href === "/dashboard" &&
                    pathname.startsWith("/dashboard"))
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
              <hr className="border-1 border-light my-2 mx-3 p-0 opacity-100" />
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

      {/* CSS for transitions and mobile display */}
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
