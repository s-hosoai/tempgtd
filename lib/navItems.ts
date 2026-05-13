import {
  Inbox,
  CalendarDays,
  FolderOpen,
  ListTodo,
  LayoutTemplate,
  ClipboardList,
} from "lucide-react"

export const NAV_ITEMS = [
  { href: "/inbox",     label: "Inbox",     icon: Inbox },
  { href: "/today",     label: "Today",     icon: CalendarDays },
  { href: "/projects",  label: "Projects",  icon: FolderOpen },
  { href: "/tasks",     label: "Tasks",     icon: ListTodo },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/review",    label: "Review",    icon: ClipboardList },
] as const
