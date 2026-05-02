import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const user = process.env.AUTH_USER ?? "admin"
  const pass = process.env.AUTH_PASSWORD

  // AUTH_PASSWORD が未設定なら保護しない（ローカル開発用）
  if (!pass) return NextResponse.next()

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6))
    const colon = decoded.indexOf(":")
    const inputUser = decoded.slice(0, colon)
    const inputPass = decoded.slice(colon + 1)
    if (inputUser === user && inputPass === pass) {
      return NextResponse.next()
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="GTD", charset="UTF-8"',
    },
  })
}

export const config = {
  // 静的ファイル・画像以外の全リクエストに適用
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
