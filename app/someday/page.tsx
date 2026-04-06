import { TaskList } from "@/components/TaskList"

export default function SomedayPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Someday / Maybe</h1>
      <p className="text-sm text-gray-500">いつかやる・たぶんやるタスク。Next へ昇格させることができます。</p>
      <TaskList status="someday" emptyText="Somedayのタスクがありません" />
    </div>
  )
}
