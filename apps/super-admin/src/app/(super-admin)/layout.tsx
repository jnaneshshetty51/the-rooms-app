import { auth } from "@the-rooms/auth";
import { SuperAdminLayout } from "./_components/SuperAdminLayout";
import { redirect } from "next/navigation";
import { ToastProvider } from "@the-rooms/ui";

export default async function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName =
    session.user.name ?? session.user.email?.split("@")[0] ?? "Super Admin";
  const userEmail = session.user.email ?? undefined;

  return (
    <ToastProvider>
      <SuperAdminLayout userName={userName} userEmail={userEmail}>
        {children}
      </SuperAdminLayout>
    </ToastProvider>
  );
}
