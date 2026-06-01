// apps/guest-portal/src/app/api/auth/forgot-password/route.ts
// POST /api/auth/forgot-password — Send password reset link via Resend
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { db } from "@the-rooms/db"
import { Resend } from "resend"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

// ─── Signed Token ─────────────────────────────────────────────────────────────
// Token format: base64url(JSON({email, exp})).hmac-sha256(payload, NEXTAUTH_SECRET)
// No DB storage needed — the signature proves authenticity; exp proves freshness.

function generateResetToken(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET not configured")

  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + 15 * 60 * 1000 })
  ).toString("base64url")

  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return `${payload}.${sig}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isActive: true },
    })

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    const resetToken = generateResetToken(email)
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${encodeURIComponent(resetToken)}`

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn("[forgot-password] RESEND_API_KEY not configured — skipping email")
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    const resend = new Resend(resendApiKey)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@therooms.in",
      to: email,
      subject: "Reset your The Rooms password",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 48px; height: 48px; background: #E17055; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
            </div>
            <h1 style="color: #2D3436; margin: 0 0 8px 0; font-size: 24px;">Password Reset Request</h1>
            <p style="color: #636E72; margin: 0;">Hi ${user.name ?? "there"},</p>
          </div>

          <div style="background: #FAFAF8; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #2D3436; margin: 0 0 16px 0; font-size: 15px;">
              We received a request to reset your The Rooms account password. Click the button below to set a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #E17055; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Reset Password
            </a>
            <p style="color: #636E72; font-size: 13px; margin: 16px 0 0 0;">
              This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>

          <p style="color: #636E72; font-size: 13px; text-align: center;">
            &copy; ${new Date().getFullYear()} The Rooms. All rights reserved.
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
