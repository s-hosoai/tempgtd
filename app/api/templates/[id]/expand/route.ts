import { NextRequest, NextResponse } from "next/server"
import { expandTemplate } from "@/lib/templateExpand"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await expandTemplate(parseInt(id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
