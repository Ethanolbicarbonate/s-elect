// app/(student)/layout.js

import { getServerSession } from "next-auth/next";
import { authOptions } from '../api/auth/[...nextauth]/route'; // Ensure this path is correct
import { redirect } from 'next/navigation';

export default async function StudentLayout({ children }) {
  const session = await getServerSession(authOptions);

  // This check is good for server-side protection of the layout
  if (!session || session.user?.role !== 'STUDENT') {
    console.log("StudentLayout: No session or not a student, redirecting to /student-login");
    redirect('/student-login'); // Or '/' if your role selection is at root and middleware handles redirect
  }

  console.log("StudentLayout: Rendering for student:", session.user.email);

  return (
    <div className="student-layout-wrapper" style={{ border: '2px solid blue', padding: '10px' }}>
      <header style={{ backgroundColor: 'aliceblue', padding: '1em' }}>
        <h2>Simplified Student Layout Header</h2>
        <p>User: {session.user.firstName || session.user.email}</p>
        <p>College: {session.user.college}</p>
      </header>
      <main style={{ padding: '1em', border: '1px solid lightblue', marginTop: '1em' }}>
        {children}
      </main>
      <footer style={{ backgroundColor: 'aliceblue', padding: '1em', marginTop: '1em' }}>
        <p>Simplified Student Layout Footer</p>
      </footer>
    </div>
  );
}