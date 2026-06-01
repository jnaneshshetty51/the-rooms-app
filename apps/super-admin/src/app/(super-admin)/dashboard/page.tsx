import { auth } from "@the-rooms/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardContent } from "./_components/DashboardContent";
import { LoadingSpinner } from "@the-rooms/ui";

export const metadata = {
  title: "Dashboard — Super Admin | The Rooms",
};

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
