"use client"

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, AlertCircle, Loader2, Shield } from "lucide-react"

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const errorParam = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes("locked") || result.error.includes("Locked")) {
          setError("Your account has been locked. Please try again in 15 minutes.")
        } else {
          setError("Invalid email or password. Please try again.")
        }
        setIsLoading(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
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
            {/* Super Admin badge with shield */}
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#E17055] flex items-center justify-center mb-6 relative">
              <Shield className="w-10 h-10 text-white" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#E17055] border-2 border-[#2D3436] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">SA</span>
              </div>
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
              "System-wide configuration & controls",
              "Multi-property management",
              "Audit logs & compliance reports",
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

      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-white">
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E17055] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#2D3436]">The Rooms</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-6 h-6 text-[#E17055]" />
              <span className="text-xs font-semibold text-[#E17055] uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#2D3436] mb-1">
              Super Admin Portal
            </h2>
            <p className="text-[#636E72] text-sm">
              Restricted access — authorized personnel only
            </p>
          </div>

          {(error || (errorParam === "CredentialsSignin" && error?.includes("locked"))) && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              {error?.includes("locked") ? (
                <Lock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm text-red-700">
                {error ?? "Invalid email or password. Please try again."}
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
                placeholder="superadmin@therooms.in"
                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] placeholder:text-[#B2BEC3] focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent transition-all text-sm"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2D3436] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] placeholder:text-[#B2BEC3] focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent transition-all text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#636E72] hover:text-[#2D3436] transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-sm text-[#E17055] hover:text-[#D35B3F] font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-lg bg-[#2D3436] hover:bg-[#3d4a4c] disabled:bg-[#636E72] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Note:</strong> All actions in this portal are logged for security and compliance purposes.
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-[#636E72]">
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
