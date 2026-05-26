// src/app/api/check-admin/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const admin = createAdminClient()
    // perPage: 1000 is Supabase's hard maximum for listUsers.
    // This single-tenant PhD app will never approach that scale.
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error || !data) {
      // Fail open — treat as "admin exists" to avoid locking users out
      return NextResponse.json({ exists: true })
    }
    const hasAdmin = data.users.some(
      (u) => (u.app_metadata as { role?: string } | undefined)?.role === 'admin'
    )
    return NextResponse.json({ exists: hasAdmin })
  } catch {
    return NextResponse.json({ exists: true })
  }
}
