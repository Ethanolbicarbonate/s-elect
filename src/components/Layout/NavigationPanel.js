// components/Layout/NavigationPanel.js (Example Snippet)
'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react'; // Import useSession and signOut
import { useRouter } from 'next/navigation';

export default function NavigationPanel() {
  const { data: session, status } = useSession(); // Get session data
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false }); // Sign out without automatic redirect
    router.push('/'); // Redirect to role selection page after logout
  };

  if (status === "loading") {
    return <div>Loading Nav...</div>; // Or a proper skeleton loader
  }

  const userRole = session?.user?.role; // e.g., STUDENT, SUPER_ADMIN, MODERATOR

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light"> {/* Example nav structure */}
      <div className="container-fluid">
        <Link className="navbar-brand" href={userRole === 'STUDENT' ? '/dashboard' : '/admin/dashboard'}>sELECT</Link>
        {/* Add responsive toggle button if needed */}

        <div className="collapse navbar-collapse"> {/* Wrap links */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {/* Common Links */}
             {session && (
                 <li className="nav-item">
                     <Link className="nav-link" href={userRole === 'STUDENT' ? '/dashboard' : '/admin/dashboard'}>Dashboard</Link>
                 </li>
             )}

            {/* Student Links (NAV-FR-004) */}
            {userRole === 'STUDENT' && (
              <>
                <li className="nav-item">
                   <Link className="nav-link" href="/candidates">Candidates</Link> {/* Candidate Viewing */}
                </li>
                 <li className="nav-item">
                   <Link className="nav-link" href="/vote">Vote</Link> {/* Voting Panel */}
                </li>
                 <li className="nav-item">
                   <Link className="nav-link" href="/results">Results</Link> {/* Student Results */}
                </li>
                {/* Add other student links */}
              </>
            )}

            {/* Admin Links (NAV-FR-005, RBAC-FR-001-004) */}
            {userRole === 'SUPER_ADMIN' && (
               <>
                <li className="nav-item">
                   <Link className="nav-link" href="/admin/election-settings">Election Settings</Link>
                </li>
                 <li className="nav-item">
                   <Link className="nav-link" href="/admin/candidates">Manage Candidates</Link> {/* SuperAdmin likely sees all */}
                </li>
                 <li className="nav-item">
                   <Link className="nav-link" href="/admin/audit-log">Audit Log</Link>
                </li>
                 <li className="nav-item">
                   <Link className="nav-link" href="/admin/feedback">Feedback</Link>
                </li>
                 <li className="nav-item">
                   <Link className="nav-link" href="/admin/sessions">Manage Sessions</Link>
                </li>
                <li className="nav-item">
                   <Link className="nav-link" href="/admin/results">Admin Results</Link>
                </li>
                {/* Add other Super Admin links */}
              </>
            )}
             {userRole === 'MODERATOR' && (
               <>
                 <li className="nav-item">
                   <Link className="nav-link" href="/admin/candidates">Manage Candidates</Link> {/* Moderator specific */}
                </li>
                 {/* Moderators likely don't see other admin sections */}
              </>
            )}
             {userRole === 'AUDITOR' && (
               <>
                <li className="nav-item">
                   <Link className="nav-link" href="/admin/audit-log">Audit Log</Link>
                </li>
                <li className="nav-item">
                   <Link className="nav-link" href="/admin/results">View Results</Link> {/* Read-only access */}
                </li>
                 {/* Add other Auditor links */}
              </>
            )}
          </ul>
           {/* Logout Button */}
           {session && (
             <button className="btn btn-outline-danger" onClick={handleLogout}>
               Log Out
             </button>
           )}
        </div>
      </div>
    </nav>
  );
}