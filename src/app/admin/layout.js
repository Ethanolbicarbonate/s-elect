// src/app/admin/layout.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary
import { redirect } from 'next/navigation';
import Link from "next/link"; // For potential logout link

// Placeholder for a real admin navigation panel
const AdminNavigationPanel = ({ adminUser }) => {
  return (
    <nav style={{ backgroundColor: 'darkseagreen', padding: '1em', marginBottom: '1em' }}>
      <h4>Admin Navigation</h4>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        <li><Link href="/admin/dashboard" style={{ color: 'white' }}>Dashboard</Link></li>
        <li><Link href="/admin/candidates" style={{ color: 'white' }}>Candidates</Link></li>
        <li><Link href="/admin/election-settings" style={{ color: 'white' }}>Election Settings</Link></li>
        <li><Link href="/admin/results" style={{ color: 'white' }}>Results</Link></li>
        <li><Link href="/admin/audit-log" style={{ color: 'white' }}>Audit Log</Link></li>
        {/* Add more links based on admin role if needed */}
        <li>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" style={{ background: 'none', border: 'none', color: 'white', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>
              Sign Out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
};


export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);

  const allowedAdminRoles = ['SUPER_ADMIN', 'AUDITOR', 'MODERATOR'];

  if (!session || !session.user || !allowedAdminRoles.includes(session.user.role)) {
    console.log("AdminLayout: No session or not an authorized admin, redirecting to /admin-login");
    redirect('/admin-login');
  }

  console.log("AdminLayout: Rendering for admin:", session.user.email, "Role:", session.user.role);

  return (
    <div className="admin-layout-wrapper" style={{ border: '2px solid darkgreen', padding: '10px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ backgroundColor: 'lightgreen', padding: '1em', textAlign: 'center' }}>
        <h1>sELECT - Admin Portal</h1>
        <p>User: {session.user.email}</p>
        <p>Role: {session.user.role}
          {session.user.role === 'MODERATOR' && session.user.college ? ` (${session.user.college})` : ''}
        </p>
      </header>
      <div style={{ display: 'flex', flexGrow: 1 }}>
        <AdminNavigationPanel adminUser={session.user} />
        <main style={{ padding: '1em', border: '1px solid lightgreen', marginTop: '1em', flexGrow: 1, backgroundColor: '#f9f9f9' }}>
          {children}
        </main>
      </div>
      <footer style={{ backgroundColor: 'lightgreen', padding: '1em', marginTop: 'auto', textAlign: 'center' }}>
        <p>Simplified Admin Layout Footer | © sELECT {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}