import { TaskList } from "@/components/TaskList"

export default function WaitingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Waiting For</h1>
      <p className="text-sm text-gray-500">委任済み・誰かを待っているタスク。</p>
      <TaskList status="waiting" emptyText="待ちのタスクがありません" />
    </div>
  )
}
