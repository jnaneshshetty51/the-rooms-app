// POST /api/auth/magic-link — generate a signed magic-link token and email it to the guest
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { db } from "@the-rooms/db"

const schema = z.object({ email: z.string().email() })

// H3: Simple in-memory rate limiter (5 requests per minute per IP)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 1000 }

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }

  record.count++
  return { allowed: true }
}

function generateToken(email: string): string {
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
    // H3: Rate limiting to prevent brute force attacks
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'

    const rateLimitResult = checkRateLimit(clientIp)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter ?? 60),
          }
        }
      )
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const { email } = parsed.data

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isActive: true, role: true },
    })

    // Always return success to prevent email enumeration
    if (!user || !user.isActive || user.role !== "GUEST") {
      return NextResponse.json({ success: true })
    }

    const token = generateToken(email)
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001"
    const magicUrl = `${baseUrl}/magic-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      // Dev mode: log link to console so devs can test without Resend
      console.log(`[magic-link] ${user.name ?? email} → ${magicUrl}`)
      return NextResponse.json({ success: true })
    }

    // Send via Resend
    const { Resend } = await import("resend")
    const resend = new Resend(resendKey)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@therooms.in",
      to: email,
      subject: "Sign in to The Rooms Guest Portal",
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="width:48px;height:48px;background:#E17055;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <span style="color:white;font-size:22px;font-weight:700;">R</span>
            </div>
            <h1 style="color:#2D3436;margin:0 0 6px;font-size:22px;">Your Magic Link</h1>
            <p style="color:#636E72;margin:0;">Hi${user.name ? ` ${user.name}` : ""}, click below to sign in instantly.</p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${magicUrl}" style="display:inline-block;background:#E17055;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
              Sign In to Guest Portal
            </a>
          </div>
          <p style="color:#636E72;font-size:13px;text-align:center;">Link expires in 15 minutes. If you didn&apos;t request this, ignore this email.</p>
          <p style="color:#B2BEC3;font-size:12px;text-align:center;margin-top:24px;">&copy; ${new Date().getFullYear()} The Rooms. All rights reserved.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[magic-link]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
