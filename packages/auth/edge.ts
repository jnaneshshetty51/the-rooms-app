// packages/auth/edge.ts
// Edge-compatible auth for use in middleware.ts (Edge Runtime).
// No DB queries, no Prisma — safe for Edge bundling.
// Sessions created by the full auth (index.ts) are verifiable here because
// both use the same NEXTAUTH_SECRET, JWT strategy, and NEXTAUTH_COOKIE_NAME.
// AUTH_TRUST_HOST=1 env var is set per-app to allow reverse-proxy operation.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line
import NextAuth from "next-auth"

const cookieName = `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}${
  process.env.NEXTAUTH_COOKIE_NAME ?? "next-auth.session-token"
}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { auth } = (NextAuth as any)({
  providers: [],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.NEXTAUTH_SESSION_MAX_AGE ?? 24 * 60 * 60),
  },
  cookies: {
    sessionToken: {
      name: cookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },
})
