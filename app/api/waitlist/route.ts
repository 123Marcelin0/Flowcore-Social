import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, company, role, challenge } = body || {}
    // Email is optional for this demo flow to support CTA form without email.
    // Validate basic types when provided
    if (email && typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 })
    }
    // For demo purposes, just log. Integrate DB or email tool here.
    console.log("WAITLIST", { email, name, company, role, challenge, ts: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 })
  }
}





