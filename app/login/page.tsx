"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/"

  const [user, setUser] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push(from)
    } else {
      setError("ユーザー名またはパスワードが違います")
    }
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-8 w-full max-w-sm">
      <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">TempGTD</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">ユーザー名</label>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            autoFocus
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !user || !password}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "確認中..." : "ログイン"}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
