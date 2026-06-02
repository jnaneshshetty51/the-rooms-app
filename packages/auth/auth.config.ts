// packages/auth/auth.config.ts
import Credentials from "next-auth/providers/credentials"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line - NextAuthConfig type unavailable when workspace packages are compiled from different contexts
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"
import { db } from "@the-rooms/db"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  isMagicLink: z.string().optional(),
  token: z.string().optional(),
})

function verifyMagicToken(token: string, email: string): boolean {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return false
  try {
    const dotIndex = token.lastIndexOf(".")
    if (dotIndex === -1) return false
    const payload = token.slice(0, dotIndex)
    const sig = token.slice(dotIndex + 1)
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex")
    if (sig !== expectedSig) return false
    const { email: tokenEmail, exp } = JSON.parse(Buffer.from(payload, "base64url").toString())
    return tokenEmail === email && Date.now() < exp
  } catch {
    return false
  }
}

// Cookie name is configurable per-app so sessions don't collide across portals.
// Fallback keeps backward compat with older deployments that don't set the var.
const cookieName = `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}${
  process.env.NEXTAUTH_COOKIE_NAME ?? "next-auth.session-token"
}`

// trustHost is set via the AUTH_TRUST_HOST env var (recommended for reverse-proxy
// deployments). No code-level flag is needed — Auth.js v5 reads it automatically.

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password, isMagicLink, token } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        // Magic Link Logic
        if (isMagicLink === "true" && !password) {
          if (!user || user.role !== "GUEST") return null
          if (!user.isActive) return null

          // Production: token required. Dev fallback: allow without token.
          if (token) {
            if (!verifyMagicToken(token, email)) return null
          } else if (process.env.NODE_ENV === "production") {
            return null
          }

          await db.user.update({
            where: { id: user.id },
            data: { attempts: 0, lastLogin: new Date() },
          })

          return { id: user.id, email: user.email, name: user.name, role: user.role }
        }

        // Standard Password Logic
        if (!password) return null
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
    // Per-app duration: guest portal sets 30d, staff portals set 8-12h.
    // Falls back to 24h when NEXTAUTH_SESSION_MAX_AGE is not specified.
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
}