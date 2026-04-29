import { redirect } from "next/navigation"
export default function DelegatePage() { redirect("/tasks?status=delegate") }
