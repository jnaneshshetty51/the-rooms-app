import { auth } from "@the-rooms/auth/edge"
import { NextResponse } from "next/server"

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const role: string | undefined = req.auth?.user?.role;
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');
  const isMagicLink = req.nextUrl.pathname.startsWith('/magic-link');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isPublicRoute = req.nextUrl.pathname.startsWith('/access-denied');

  const isProtectedRoute = !isAuthRoute && !isMagicLink && !isApiRoute && !isPublicRoute;

  if (isProtectedRoute) {
    const pathname = req.nextUrl.pathname;

    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname === '/' ? '/dashboard' : pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged-in: redirect root directly to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Only GUEST role may access the guest portal
    if (role && role !== 'GUEST') {
      return NextResponse.redirect(new URL('/access-denied', req.url));
    }
  }

  if ((isAuthRoute || isMagicLink) && isLoggedIn && role === 'GUEST') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
