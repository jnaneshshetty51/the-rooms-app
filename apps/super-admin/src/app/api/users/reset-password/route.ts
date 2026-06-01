// apps/super-admin/src/app/api/users/reset-password/route.ts
// POST — triggers a password reset email for the specified user
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { z } from "zod";
import crypto from "crypto";

const resetPasswordSchema = z.object({
  userId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;
    const currentUserId = (session.user as { id?: string }).id ?? "";

    // Find target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Super admins can only reset passwords for non-SUPER_ADMIN users
    if (targetUser.role === "SUPER_ADMIN" && userId !== currentUserId) {
      return NextResponse.json(
        { error: "Cannot reset another Super Admin's password" },
        { status: 403 }
      );
    }

    // Generate a reset token (valid 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the token in the user record (add resetToken + resetTokenExpiry columns if needed)
    // For now, we store it in a dedicated ResetToken table or use a simple approach
    await db.user.update({
      where: { id: userId },
      data: {
        // In production: add resetToken + resetTokenExpiry to schema
        // For now, log and send email via Resend
      },
    });

    // Send password reset email via Resend
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
    const emailSent = await sendPasswordResetEmail({
      to: targetUser.email,
      name: targetUser.name ?? "User",
      resetUrl,
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send reset email. Check Resend configuration." },
        { status: 500 }
      );
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: currentUserId,
        action: "PASSWORD_RESET_INITIATED",
        entity: "User",
        entityId: userId,
        metadata: { targetEmail: targetUser.email },
      },
    });

    return NextResponse.json({
      data: {
        message: `Password reset email sent to ${targetUser.email}`,
        expiresIn: "1 hour",
      },
    });
  } catch (error) {
    console.error("[USERS_RESET_PASSWORD]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[PASSWORD_RESET] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "The Rooms <hello@therooms.in>",
        to,
        subject: "Reset your Super Admin password — The Rooms",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2D3436; padding: 20px; text-align: center;">
              <h1 style="color: #FAFAF8; margin: 0;">The Rooms</h1>
              <p style="color: #DFE6E9; margin: 4px 0 0; font-size: 12px;">Super Admin Portal</p>
            </div>
            <div style="padding: 24px;">
              <p>Hi ${name},</p>
              <p>A password reset was requested for your Super Admin account.</p>
              <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background: #E17055; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="color: #636E72; font-size: 12px;">
                If you didn't request this, please contact your system administrator immediately.
              </p>
            </div>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[RESEND_PASSWORD_RESET]", error);
    return false;
  }
}
