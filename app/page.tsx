import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GTD Dashboard</h1>
      <div className="grid gap-4">
        <Link href="/inbox">
          <Button variant="outline" className="w-full justify-start text-left h-auto py-4">
            <div>
              <div className="font-semibold">Inbox</div>
              <div className="text-sm text-gray-500">Capture したアイテムを処理する</div>
            </div>
          </Button>
        </Link>
        <Link href="/inbox/triage">
          <Button variant="outline" className="w-full justify-start text-left h-auto py-4">
            <div>
              <div className="font-semibold">Triage</div>
              <div className="text-sm text-gray-500">Inbox を1件ずつ振り分ける</div>
            </div>
          </Button>
        </Link>
        <Link href="/next-actions">
          <Button variant="outline" className="w-full justify-start text-left h-auto py-4">
            <div>
              <div className="font-semibold">Next Actions</div>
              <div className="text-sm text-gray-500">今すぐできる行動リスト</div>
            </div>
          </Button>
        </Link>
      </div>
    </div>
  )
}
