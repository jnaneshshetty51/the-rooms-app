import { redirect } from "next/navigation";
import { auth } from "@the-rooms/auth";

export default async function SuperAdminRootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
