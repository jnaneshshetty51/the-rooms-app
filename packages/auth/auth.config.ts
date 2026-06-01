// packages/auth/auth.config.ts
import Credentials from "next-auth/providers/credentials"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line - NextAuthConfig type unavailable when workspace packages are compiled from different contexts
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@the-rooms/db"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        if (!user || !user.isActive) return null

        // Rate limiting: if attempts >= 5, account is locked
        if (user.attempts >= 5) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
          // Increment failed attempts
          await db.user.update({
            where: { id: user.id },
            data: { attempts: { increment: 1 } },
          })
          return null
        }

        // Reset attempts on successful login
        await db.user.update({
          where: { id: user.id },
          data: { attempts: 0, lastLogin: new Date() },
        })

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
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
    maxAge: 24 * 60 * 60, // 24h for staff
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },
}