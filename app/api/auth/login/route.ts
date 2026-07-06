import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, COOKIE_MAX_AGE, createSessionToken } from "@/lib/session"

export async function POST(request: NextRequest) {
  const user = process.env.AUTH_USER ?? "admin"
  const pass = process.env.AUTH_PASSWORD

  if (!pass) return NextResponse.json({ ok: true })

  const body = await request.json()
  if (body.user !== user || body.password !== pass) {
    return NextResponse.json({ error: "認証失敗" }, { status: 401 })
  }

  const token = await createSessionToken(pass)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  })
  return res
}
