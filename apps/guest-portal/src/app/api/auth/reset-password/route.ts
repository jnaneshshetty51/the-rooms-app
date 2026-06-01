// apps/guest-portal/src/app/api/auth/reset-password/route.ts
// POST /api/auth/reset-password — Verify signed token and update password
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { db } from "@the-rooms/db"

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

// ─── Token Verification ───────────────────────────────────────────────────────
// Mirrors generateResetToken() in forgot-password/route.ts

function verifyResetToken(token: string): { email: string } | null {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return null

  const dotIndex = token.lastIndexOf(".")
  if (dotIndex === -1) return null

  const payload = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)

  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  // Constant-time comparison prevents timing attacks
  try {
    const sigBuf = Buffer.from(sig, "hex")
    const expectedBuf = Buffer.from(expectedSig, "hex")
    if (sigBuf.length !== expectedBuf.length) return null
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (typeof email !== "string" || typeof exp !== "number") return null
    if (Date.now() > exp) return null
    return { email }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      )
    }

    const { token, newPassword } = parsed.data

    const verified = verifyResetToken(token)
    if (!verified) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    const { email } = verified

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "No active account found" },
        { status: 404 }
      )
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        attempts: 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
