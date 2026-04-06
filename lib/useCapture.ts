import { useEffect } from "react"
import type { TaskStatus } from "@/lib/db/schema"

/**
 * GlobalCapture からのキャプチャイベントを受け取り、
 * 指定ステータスへの追加があった場合にコールバックを呼ぶ。
 */
export function useCapture(status: TaskStatus, onCapture: () => void) {
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ status: TaskStatus }>).detail
      // 自分のステータス宛 or Inbox（全ページで更新チャンス）に追加されたとき
      if (detail.status === status || detail.status === "inbox") {
        onCapture()
      }
    }
    window.addEventListener("gtd:captured", handler)
    return () => window.removeEventListener("gtd:captured", handler)
  }, [status, onCapture])
}
