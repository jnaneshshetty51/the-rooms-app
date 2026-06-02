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
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
