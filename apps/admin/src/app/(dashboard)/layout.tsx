// apps/admin/src/app/(dashboard)/layout.tsx
// Server Component: handles auth check and passes serializable props to clients.
import { redirect } from "next/navigation";
import { auth } from "@the-rooms/auth";
import { AdminSidebarClient } from "./_components/AdminSidebarClient";
import { AdminHeaderClient } from "./_components/AdminHeaderClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") redirect("/access-denied");

  const userName = (session.user?.name as string | undefined) ?? "Admin";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:shrink-0">
        <AdminSidebarClient userName={userName} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with Notification Bell */}
        <AdminHeaderClient portalName="Admin Portal" userName={userName} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
