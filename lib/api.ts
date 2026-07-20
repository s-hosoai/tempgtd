async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

function withJsonBody(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, withJsonBody("POST", body)),
  patch: <T>(url: string, body?: unknown) => request<T>(url, withJsonBody("PATCH", body)),
  delete: <T = void>(url: string) => request<T>(url, { method: "DELETE" }),
}
