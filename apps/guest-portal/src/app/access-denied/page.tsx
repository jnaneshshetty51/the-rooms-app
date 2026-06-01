// apps/guest-portal/src/app/access-denied/page.tsx
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
          You don&apos;t have permission to access this portal. Please sign in with an account that has the appropriate role.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 px-6 rounded-lg bg-[#2D3436] text-white font-semibold text-sm hover:bg-[#3d4a4c] transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            href="/login"
            className="block w-full py-3 px-6 rounded-lg border border-[#E5E5E5] text-[#2D3436] font-semibold text-sm hover:bg-[#FAFAF8] transition-colors"
          >
            Sign In with Different Account
          </Link>
        </div>
      </div>
    </div>
  )
}