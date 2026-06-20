// apps/front-office/src/app/(dashboard)/layout.tsx
// Server Component: Dashboard layout for front office portal
import { redirect } from "next/navigation";
import { auth } from "@the-rooms/auth";
import { DashboardLayoutClient } from "./_components/DashboardLayoutClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
