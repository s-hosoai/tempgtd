export const SESSION_COOKIE = "gtd_session"
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 365日

// AUTH_PASSWORD を鍵にした HMAC-SHA256 署名トークン（ステートレス）
export async function createSessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("gtd-session-v1")
  )
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}
