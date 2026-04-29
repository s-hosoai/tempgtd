import { redirect } from "next/navigation"
export default function WaitingPage() { redirect("/tasks?status=waiting") }
