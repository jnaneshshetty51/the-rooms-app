// packages/auth/edge.ts
// Edge-compatible auth for use in middleware.ts (Edge Runtime).
// No DB queries, no Prisma — safe for Edge bundling.
// Sessions created by the full auth (index.ts) are verifiable here because
// both use the same NEXTAUTH_SECRET and JWT strategy.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line
import NextAuth from "next-auth"

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
    maxAge: 24 * 60 * 60,
  },
})
