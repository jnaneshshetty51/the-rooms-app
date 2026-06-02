import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

// NOTE: in a real environment we'd use bcrypt, but for this demo workspace we can just save it or mock it.
// We have bcryptjs in dependencies so we can use it.
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password } = body;
    
    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating security settings:", error);
    return NextResponse.json({ error: "Failed to update security settings" }, { status: 500 });
  }
}
