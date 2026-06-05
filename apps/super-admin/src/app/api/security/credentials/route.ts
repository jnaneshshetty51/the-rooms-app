// GET /api/security/credentials — returns masked API key status from server env
import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

function maskKey(val: string | undefined, prefix: string): { masked: string; configured: boolean } {
  if (!val || val.startsWith('re_not_configured')) {
    return { masked: `${prefix}••••••••••• (not set)`, configured: false };
  }
  const visible = val.slice(0, 8);
  return { masked: `${visible}${'•'.repeat(12)}`, configured: true };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = [
    {
      name: 'Razorpay Key ID',
      ...maskKey(process.env.RAZORPAY_KEY_ID, 'rzp_'),
      status: process.env.RAZORPAY_KEY_ID ? 'ACTIVE' : 'NOT_SET',
    },
    {
      name: 'Razorpay Webhook Secret',
      ...maskKey(process.env.RAZORPAY_WEBHOOK_SECRET, 'whsec_'),
      status: process.env.RAZORPAY_WEBHOOK_SECRET ? 'ACTIVE' : 'NOT_SET',
    },
    {
      name: 'Resend Email API',
      ...maskKey(process.env.RESEND_API_KEY, 're_'),
      status: process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_not') ? 'ACTIVE' : 'NOT_SET',
    },
    {
      name: 'MinIO Access Key',
      ...maskKey(process.env.MINIO_ACCESS_KEY, 'minio_'),
      status: process.env.MINIO_ACCESS_KEY ? 'ACTIVE' : 'NOT_SET',
    },
    {
      name: 'NextAuth Secret',
      masked: process.env.NEXTAUTH_SECRET ? '••••••••••••••••••••' : 'NOT SET',
      configured: !!process.env.NEXTAUTH_SECRET,
      status: process.env.NEXTAUTH_SECRET ? 'ACTIVE' : 'NOT_SET',
    },
  ];

  return NextResponse.json({ credentials });
}
