"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Loader2, AlertCircle } from "lucide-react"

function MagicLinkContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [status, setStatus] = useState<"verifying" | "error">("verifying")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!token || !email) {
      setErrorMsg("Invalid or missing link. Please request a new one.")
      setStatus("error")
      return
    }

    signIn("credentials", {
      email,
      token,
      isMagicLink: "true",
      redirect: false,
    }).then((result) => {
      if (result?.error) {
        setErrorMsg("This link has expired or is invalid. Please request a new one.")
        setStatus("error")
      } else {
        router.replace("/dashboard")
      }
    }).catch(() => {
      setErrorMsg("Something went wrong. Please try again.")
      setStatus("error")
    })
  }, [token, email, router])

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-[#2D3436] mb-2">Link invalid</h1>
          <p className="text-sm text-[#636E72] mb-6">{errorMsg}</p>
          <a
            href="/login"
            className="inline-block w-full py-3 bg-[#E17055] text-white font-semibold rounded-lg hover:bg-[#D35B3F] transition-colors text-sm"
          >
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#E17055] flex items-center justify-center mx-auto">
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-[#E17055] mx-auto" />
        <p className="text-sm text-[#636E72]">Signing you in…</p>
      </div>
    </div>
  )
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#E17055]" />
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  )
}
