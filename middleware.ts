import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/admin', '/admin/:path*', '/admin-auth/:path*', '/dashboard/challenge/:path*'],
  runtime: 'experimental-edge',
};

async function verifyAdminSession(request: NextRequest, sessionValue: string) {
  const verify = () => fetch(new URL('/api/auth/verify-session', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session: sessionValue }),
  });

  let verifyResponse: Response;
  try {
    verifyResponse = await verify();
    if (verifyResponse.status >= 500) {
      verifyResponse = await verify();
    }
  } catch {
    try {
      verifyResponse = await verify();
    } catch {
      // The auth service could not be reached. Keep the existing cookie
      // instead of sending a signed-in admin back to the login page.
      return NextResponse.next();
    }
  }

  if (verifyResponse.status >= 500) {
    return NextResponse.next();
  }

  if (!verifyResponse.ok) {
    return NextResponse.redirect(new URL('/admin-auth', request.url));
  }

  const { isAdmin } = await verifyResponse.json();
  if (!isAdmin) {
    return NextResponse.redirect(new URL('/admin-auth', request.url));
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Only run on admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Skip middleware for admin-auth page to prevent redirect loop
    if (request.nextUrl.pathname === '/admin-auth') {
      return NextResponse.next();
    }

    const session = request.cookies.get('session');

    if (!session) {
      // Redirect to admin login if no session exists
      return NextResponse.redirect(new URL('/admin-auth', request.url));
    }

    return verifyAdminSession(request, session.value);
  }

  // Check if the URL starts with /dashboard/challenge
  if (request.nextUrl.pathname.startsWith('/dashboard/challenge')) {
    // Create a new URL for the redirect
    const redirectUrl = new URL('/challenge', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
} 