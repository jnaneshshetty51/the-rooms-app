// apps/admin/src/app/access-denied/page.tsx
import Link from "next/link"
import { ShieldX } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#2D3436] mb-3">Access Denied</h1>
        <p className="text-[#636E72] mb-8">
          This portal is restricted to Admin and Super Admin users only. Please sign in with the appropriate credentials.
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-3 px-6 rounded-lg bg-[#2D3436] text-white font-semibold text-sm hover:bg-[#3d4a4c] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}