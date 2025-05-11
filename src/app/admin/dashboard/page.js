// src/app/admin/dashboard/page.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  // The layout should already protect this page, but having session info here is useful.
  if (!session || !session.user) {
    // This case should ideally be handled by the layout's redirect
    return <p>Loading user information or redirecting...</p>;
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Welcome, {session.user.email}!</p>
      <p>Your Role: <strong>{session.user.role}</strong></p>
      {session.user.role === 'MODERATOR' && session.user.college && (
        <p>Assigned College: <strong>{session.user.college}</strong></p>
      )}
      <p>This is a placeholder for the admin dashboard content. More features will be added soon.</p>
      
      {/* Placeholder content based on role */}
      {session.user.role === 'SUPER_ADMIN' && (
        <div>
          <h3>Super Admin Controls</h3>
          <p>You have full access to system configuration and management.</p>
        </div>
      )}
      {session.user.role === 'MODERATOR' && (
        <div>
          <h3>Moderator Area</h3>
          <p>You can manage candidates and oversee election processes for your assigned college.</p>
        </div>
      )}
      {session.user.role === 'AUDITOR' && (
        <div>
          <h3>Auditor View</h3>
          <p>You have read-only access to view logs and election results for auditing purposes.</p>
        </div>
      )}
    </div>
  );
}