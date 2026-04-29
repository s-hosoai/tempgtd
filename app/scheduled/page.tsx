import { redirect } from "next/navigation"
export default function ScheduledPage() { redirect("/tasks?status=scheduled") }
