// src/components/Layout/NavigationPanel.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function NavigationPanel({ showSidebar, toggleSidebar }) { // Added props
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'bi-grid-fill' },
    { href: '/candidates', label: 'Candidates', icon: 'bi-people-fill', badge: '3' },
    { href: '/vote', label: 'Vote', icon: 'bi-check2-square' },
    { href: '/about-help', label: 'About/Help', icon: 'bi-info-circle-fill' },
    { href: '/settings', label: 'Settings', icon: 'bi-gear-fill' },
  ];

  return (
    <>
      {/* Overlay for mobile when sidebar is open (optional, but good UX) */}
      {showSidebar && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50"
          onClick={toggleSidebar} // Close sidebar on overlay click
          style={{ zIndex: 99 }}
        ></div>
      )}

      <nav
        className={`d-flex flex-column vh-100 p-3 bg-light shadow-sm position-fixed top-0 left-0 transition-transform ${
          showSidebar ? 'transform-none' : '-translate-x-full' // Slide in/out
        } d-lg-transform-none`} // Always visible on lg screens
        style={{ width: '280px', zIndex: 100}}
      >
        {/* Mobile Close Button (Inside Sidebar) */}
        <div className="d-flex justify-content-between align-items-center d-lg-none mb-3">
          <span className="fs-4 fw-bold logo-font text-primary">sELECT</span>
          <button
            className="btn btn-icon text-dark"
            onClick={toggleSidebar}
            aria-label="Close navigation"
          >
            <i className="bi bi-x-lg fs-4"></i>
          </button>
        </div>

        {/* Desktop Logo (hidden on mobile if close button is preferred) */}
        <Link href="/dashboard" className="d-none d-lg-flex align-items-center mb-3 mb-md-0 me-md-auto text-dark text-decoration-none">
          <span className="fs-4 fw-bold logo-font text-primary">sELECT</span>
        </Link>
        <hr />
        <ul className="nav nav-pills flex-column mb-auto">
          {navItems.map((item) => (
            <li className="nav-item" key={item.label}>
              <Link
                href={item.href}
                className={`nav-link d-flex align-items-center ${
                  pathname === item.href || (item.href === '/dashboard' && pathname.startsWith('/dashboard'))
                    ? 'active text-white'
                    : 'text-dark'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => { if (showSidebar && toggleSidebar) toggleSidebar(); }} // Close sidebar on nav item click on mobile
              >
                <i className={`bi ${item.icon} me-2`}></i>
                {item.label}
                {item.badge && <span className="badge bg-warning text-dark ms-auto">{item.badge}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <hr />
        <div className="pb-2">
          <button
            onClick={handleLogout}
            className="nav-link text-danger d-flex align-items-center w-100"
            style={{ background: 'none', border: 'none', textAlign: 'left' }}
          >
            <i className="bi bi-box-arrow-left me-2"></i>
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
        @media (min-width: 992px) { /* lg breakpoint in Bootstrap */
          .d-lg-transform-none {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}