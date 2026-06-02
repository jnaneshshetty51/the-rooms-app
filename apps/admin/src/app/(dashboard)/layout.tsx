// apps/admin/src/app/(dashboard)/layout.tsx
// Server Component: handles auth check and passes serializable props to clients.
// Icons and nav arrays live in AdminSidebarClient (Client Component boundary).
import { redirect } from "next/navigation";
import { auth } from "@the-rooms/auth";
import { DashboardHeader, AppShell } from "@the-rooms/ui";
import { AdminSidebarClient } from "./_components/AdminSidebarClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") redirect("/access-denied");

  const userName = (session.user?.name as string | undefined) ?? "Admin";

  return (
    <AppShell
      sidebar={<AdminSidebarClient userName={userName} />}
      header={<DashboardHeader portalName="Admin Portal" userName={userName} notificationCount={0} />}
    >
      {children}
    </AppShell>
  );
}
