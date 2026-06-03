import { auth } from "@the-rooms/auth/edge"
import { NextResponse } from "next/server"

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isPublicRoute = req.nextUrl.pathname.startsWith('/access-denied');

  const isProtectedRoute = !isAuthRoute && !isApiRoute && !isPublicRoute;

  if (isProtectedRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = req.auth?.user?.role;
    if (role === 'GUEST') {
      return NextResponse.redirect(new URL('/access-denied', req.url));
    }

    if (role === 'HOUSEKEEPING' && !req.nextUrl.pathname.startsWith('/housekeeping')) {
      return NextResponse.redirect(new URL('/housekeeping', req.url));
    }
  }

  if (isAuthRoute && isLoggedIn) {
    const role = req.auth?.user?.role;
    if (role === 'HOUSEKEEPING') {
      return NextResponse.redirect(new URL('/housekeeping', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
