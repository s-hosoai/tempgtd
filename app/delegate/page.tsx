import { TaskList } from "@/components/TaskList"

export default function DelegatePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Delegate</h1>
      <p className="text-sm text-gray-500">これから誰かに委譲するタスク。依頼したら「依頼済み → Waiting」へ。</p>
      <TaskList status="delegate" emptyText="委譲予定のタスクがありません" />
    </div>
  )
}
