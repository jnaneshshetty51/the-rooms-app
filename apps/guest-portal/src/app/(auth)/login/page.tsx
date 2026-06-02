"use client"

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"

function LoginInner() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Something went wrong. Please try again.")
        setIsLoading(false)
        return
      }

      // Always show "check your email" regardless of whether the account exists
      // (prevents email enumeration)
      setSuccess(true)
      setIsLoading(false)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT — Brand panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#2D3436] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FAFAF8" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#E17055] flex items-center justify-center mb-6">
              <span className="text-white font-bold text-3xl">R</span>
            </div>
            <h1 className="text-4xl font-bold text-[#FAFAF8] tracking-tight mb-2">
              The Rooms
            </h1>
            <div className="w-12 h-1 bg-[#E17055] mx-auto mb-4" />
            <p className="text-[#DFE6E9] text-xl font-light italic">
              Your Space. Your Stay.
            </p>
          </div>

          <div className="mt-12 space-y-4 text-left">
            {[
              "View your bookings & invoices",
              "Request services & amenities",
              "Check-in quickly & easily",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-[#DFE6E9]">
                <div className="w-2 h-2 rounded-full bg-[#E17055] flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E17055] via-[#E17055] to-transparent" />
      </div>

      {/* RIGHT — Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-white">
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E17055] flex items-center justify-center">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <span className="text-2xl font-bold text-[#2D3436]">The Rooms</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#2D3436] mb-1">
              Guest Portal
            </h2>
            <p className="text-[#636E72] text-sm">
              Enter your email to receive a secure login link
            </p>
          </div>

          {(error || (errorParam === "CredentialsSignin" && error?.includes("locked"))) && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {error ?? "Guest account not found. Make a booking to create an account."}
              </p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
              <div className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 font-bold">✓</div>
              <p className="text-sm text-green-700">
                Check your email for the magic login link!
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2D3436] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] placeholder:text-[#B2BEC3] focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent transition-all text-sm"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-lg bg-[#2D3436] hover:bg-[#3d4a4c] disabled:bg-[#636E72] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending link...</>
              ) : "Send Magic Link"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#636E72]">
            &copy; {new Date().getFullYear()} The Rooms. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
