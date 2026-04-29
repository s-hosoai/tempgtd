import { redirect } from "next/navigation"
export default function DonePage() { redirect("/tasks?status=done") }
