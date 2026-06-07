export interface ParsedCapture {
  title: string
  status?: "next" | "delegate" | "waiting" | "someday" | "scheduled" | "idea"
  twoMinute?: boolean
  projectName?: string
  scheduledAt?: number
}

const STATUS_MAP: Record<string, { status: ParsedCapture["status"]; twoMinute?: boolean }> = {
  J: { status: "next", twoMinute: true },
  N: { status: "next" },
  S: { status: "someday" },
  D: { status: "delegate" },
  W: { status: "waiting" },
  I: { status: "idea" },
}

export function parseCapture(input: string): ParsedCapture {
  let remaining = input.trim()
  const result: ParsedCapture = { title: remaining }

  // [X] prefix → status (J=Just/2分, N=Next, S=Someday, D=Delegate, W=Waiting)
  const statusMatch = remaining.match(/^\[([A-Za-z])\]\s*(.*)$/)
  if (statusMatch) {
    const letter = statusMatch[1].toUpperCase()
    const info = STATUS_MAP[letter]
    if (info) {
      result.status = info.status
      if (info.twoMinute) result.twoMinute = true
      remaining = statusMatch[2].trim()
    }
  }

  // M/D HH:MM or M/D prefix → scheduled (only when no [X] status set)
  if (!result.status) {
    const dtMatch = remaining.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(.+)$/)
    if (dtMatch) {
      const dt = buildDate(parseInt(dtMatch[1]), parseInt(dtMatch[2]), parseInt(dtMatch[3]), parseInt(dtMatch[4]))
      result.status = "scheduled"
      result.scheduledAt = dt.getTime()
      remaining = dtMatch[5].trim()
    } else {
      const dMatch = remaining.match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/)
      if (dMatch) {
        const dt = buildDate(parseInt(dMatch[1]), parseInt(dMatch[2]), 9, 0)
        result.status = "scheduled"
        result.scheduledAt = dt.getTime()
        remaining = dMatch[3].trim()
      }
    }
  }

  // ProjectName：/: prefix (full-width or half-width colon; skip if scheduled)
  if (!result.scheduledAt) {
    const projMatch = remaining.match(/^(.+?)[：:]\s*(.+)$/)
    if (projMatch) {
      result.projectName = projMatch[1].trim()
      remaining = projMatch[2].trim()
    }
  }

  result.title = remaining
  return result
}

function buildDate(month: number, day: number, hour: number, minute: number): Date {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dt = new Date(now.getFullYear(), month - 1, day, hour, minute, 0, 0)
  const dtDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  if (dtDay < today) dt.setFullYear(now.getFullYear() + 1)
  return dt
}

export function parsedCaptureHint(p: ParsedCapture): string | null {
  const parts: string[] = []
  if (p.status === "scheduled" && p.scheduledAt) {
    const d = new Date(p.scheduledAt)
    const mm = d.getMonth() + 1
    const dd = d.getDate()
    const hh = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    parts.push(`Scheduled: ${mm}/${dd} ${hh}:${min}`)
  } else if (p.status === "next" && p.twoMinute) {
    parts.push("2分ルール → Next 先頭")
  } else if (p.status) {
    const label: Record<string, string> = { next: "Next Action", someday: "Someday", delegate: "Delegate", waiting: "Waiting", idea: "Idea" }
    parts.push(label[p.status] ?? p.status)
  }
  if (p.projectName) parts.push(`プロジェクト: ${p.projectName}`)
  return parts.length > 0 ? parts.join("  /  ") : null
}
