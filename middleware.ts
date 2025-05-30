import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt'; //middleware checks

const secret = process.env.AUTH_SECRET;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  const isStudentRoute = pathname.startsWith('/dashboard') ||
                         pathname.startsWith('/vote') ||
                         pathname.startsWith('/candidates') ||
                         pathname.startsWith('/results');

  const isAdminRoute = pathname.startsWith('/admin');

  const isPublicApiRoute = pathname.startsWith('/api/public');
  const isAuthApiRoute = pathname.startsWith('/api/auth'); // next-auth routes

  // Allow requests to auth API routes and static files/public API
  if (isAuthApiRoute || pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico') || isPublicApiRoute) {
    return NextResponse.next();
  }

  // --- Authentication Check ---
  if (!token) {
    // If user is not logged in and trying to access a protected route
    if (isStudentRoute || isAdminRoute) {
      console.log(`Unauthenticated access to ${pathname}, redirecting to login.`);
      // Determine where to redirect based on the route they tried to access
      const loginUrl = isAdminRoute ? '/admin-login' : '/student-login';
      const url = req.nextUrl.clone();
      url.pathname = loginUrl;
      // Optionally add callbackUrl: url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    // Allow access to public pages if not logged in
    return NextResponse.next();
  }

  // --- Authorization Check (User is logged in) ---
  const userRole = token.role as string; // Role from JWT callback
  const userCollege = token.college as string; // College from JWT callback

  // Prevent logged-in users from accessing login pages
   if (pathname === '/student-login' || pathname === '/admin-login' || pathname === '/') {
        const redirectPath = userRole === 'STUDENT' ? '/dashboard' : '/admin/dashboard';
        console.log(`Authenticated user (${userRole}) accessing login/root page, redirecting to ${redirectPath}.`);
        const url = req.nextUrl.clone();
        url.pathname = redirectPath;
        return NextResponse.redirect(url);
   }

  // Student Route Protection
  if (isStudentRoute && userRole !== 'STUDENT') {
    console.log(`Non-student (${userRole}) accessing student route ${pathname}, redirecting.`);
     const url = req.nextUrl.clone();
     url.pathname = '/admin/dashboard'; // Or appropriate admin page
     return NextResponse.redirect(url);
  }

  // Admin Route Protection
  if (isAdminRoute && !['SUPER_ADMIN', 'AUDITOR', 'MODERATOR'].includes(userRole)) {
     console.log(`Non-admin (${userRole}) accessing admin route ${pathname}, redirecting.`);
     const url = req.nextUrl.clone();
     url.pathname = '/dashboard'; // Redirect student to their dashboard
     return NextResponse.redirect(url);
  }

  // Role-Specific Admin Authorization (Example for Moderator)
  if (userRole === 'MODERATOR') {
    // Moderators should only access candidate management (and maybe their dashboard/results view)
     const allowedModeratorPaths = ['/admin/dashboard', '/admin/candidates', '/admin/results']; // Add specific paths like /admin/candidates/add etc.
     const isAllowed = allowedModeratorPaths.some(p => pathname.startsWith(p));

     if (isAdminRoute && !isAllowed) {
        console.log(`Moderator accessing restricted admin route ${pathname}, redirecting.`);
        const url = req.nextUrl.clone();
        url.pathname = '/admin/dashboard'; // Redirect to their allowed dashboard
        return NextResponse.redirect(url);
     }
  }
  // If all checks pass, allow the request
  return NextResponse.next();
}

// Define which paths the middleware should run on
export const config = {
    matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}