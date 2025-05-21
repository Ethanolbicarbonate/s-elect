// src/app/admin/dashboard/page.js
import { getServerSession } from "next-auth/next"; // Keep for server-side data fetching
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Import Admin Widget Components
import OverviewWidget from "@/components/Admin/Dashboard/OverviewWidget";
import RecentActivityWidget from "@/components/Admin/Dashboard/RecentActivityWidget"; // Create this
import SystemStatusWidget from "@/components/Admin/Dashboard/SystemStatusWidget";   // Create this
import QuickActionsWidget from "@/components/Admin/Dashboard/QuickActionsWidget"; // Create this

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return <p>Loading or not authorized...</p>; // Should be handled by layout
  }

  // Dummy data - replace with actual data fetching
  const overviewData = {
    electionStatus: "Upcoming", // Example: "Not Started", "Ongoing", "Ended"
    totalVoters: 1250, // Example
    candidatesRegistered: 45, // Example
  };

  return (
    <div>
      {/* Row 1: Overview, Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <OverviewWidget {...overviewData} />
        </div>
        <div className="col-lg-4">
          <QuickActionsWidget userRole={session.user.role} /> {/* Pass role for conditional actions */}
        </div>
      </div>

      {/* Row 2: Recent Activity, System Status */}
      <div className="row g-4">
        <div className="col-lg-7">
          <RecentActivityWidget />
        </div>
        <div className="col-lg-5">
          <SystemStatusWidget />
        </div>
      </div>
    </div>
  );
}

// --- Create these placeholder components in src/components/Admin/Dashboard/ ---

// Example for QuickActionsWidget.js (create the actual file)
/*
'use client';
import Link from 'next/link';
export default function QuickActionsWidget({ userRole }) {
  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <h5 className="card-title text-primary mb-3">Quick Actions</h5>
        <div className="d-grid gap-2">
          {userRole === 'SUPER_ADMIN' && (
            <Link href="/admin/election-settings" className="btn btn-outline-primary">Manage Election</Link>
          )}
          {(userRole === 'SUPER_ADMIN' || userRole === 'MODERATOR') && (
            <Link href="/admin/candidates/add" className="btn btn-outline-success">Add Candidate</Link>
          )}
          <Link href="/admin/results" className="btn btn-outline-info">View Results</Link>
        </div>
      </div>
    </div>
  );
}
*/

// Example for RecentActivityWidget.js (create the actual file)
/*
'use client';
export default function RecentActivityWidget() {
  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <h5 className="card-title text-primary mb-3">Recent Activity</h5>
        <ul className="list-group list-group-flush">
          <li className="list-group-item">Admin 'superadmin' logged in.</li>
          <li className="list-group-item">Election 'USC 2025' status changed to Upcoming.</li>
          <li className="list-group-item">New candidate 'John Doe' added.</li>
        </ul>
      </div>
    </div>
  );
}
*/

// Example for SystemStatusWidget.js (create the actual file)
/*
'use client';
export default function SystemStatusWidget() {
  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <h5 className="card-title text-primary mb-3">System Status</h5>
        <p><i className="bi bi-hdd-fill text-success me-2"></i>Database: Connected</p>
        <p><i className="bi bi-envelope-fill text-success me-2"></i>Email Service: Operational</p>
        <p><i className="bi bi-shield-check-fill text-success me-2"></i>Security: Monitored</p>
      </div>
    </div>
  );
}
*/