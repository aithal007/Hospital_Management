import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Define paths that require authentication
  // Note: These paths will be created in future steps (Phases 1-5+)
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/profile') || 
    pathname.startsWith('/appointments') || 
    pathname.startsWith('/billing') ||
    pathname.startsWith('/patients') || 
    pathname.startsWith('/doctors');

  // If the path is protected and there is no token, redirect to /login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    // Store the intended path to redirect back later if needed
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If the user is logged in and tries to access login or register page, redirect to home
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
