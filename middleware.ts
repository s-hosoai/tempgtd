import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE, createSessionToken } from "@/lib/session"

export async function middleware(request: NextRequest) {
  const user = process.env.AUTH_USER ?? "admin"
  const pass = process.env.AUTH_PASSWORD

  // AUTH_PASSWORD 未設定はローカル開発用として保護しない
  if (!pass) return NextResponse.next()

  const { pathname } = request.nextUrl

  // ログイン画面・認証 API は除外
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // API キー認証（X-Api-Key ヘッダーまたは Authorization: Bearer）
  const apiKey = process.env.API_KEY
  if (apiKey) {
    const providedKey =
      request.headers.get("x-api-key") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (providedKey === apiKey) return NextResponse.next()
  }

  const expectedToken = await createSessionToken(pass)

  // セッションクッキーを確認
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value
  if (sessionToken === expectedToken) {
    return NextResponse.next()
  }

  // Basic 認証をフォールバックとして確認（curl 向け）
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6))
    const colon = decoded.indexOf(":")
    if (decoded.slice(0, colon) === user && decoded.slice(colon + 1) === pass) {
      return NextResponse.next()
    }
  }

  // API リクエストは 401
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // ブラウザはログイン画面へリダイレクト
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("from", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
