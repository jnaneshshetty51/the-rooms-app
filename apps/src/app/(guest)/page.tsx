import { redirect } from "next/navigation";

export default function GuestRootPage() {
  redirect("/dashboard");
}
