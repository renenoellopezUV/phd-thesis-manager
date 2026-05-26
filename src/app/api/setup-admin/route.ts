// src/app/api/setup-admin/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  let email: string
  let password: string

  try {
    const body = await request.json() as { email?: unknown; password?: unknown }
    email = typeof body.email === 'string' ? body.email.trim() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Re-verify no admin exists — prevents race conditions and direct API abuse
  // perPage: 1000 is Supabase's hard maximum; this app will never approach that scale
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError || !listData) {
    return NextResponse.json({ error: 'Failed to verify system state' }, { status: 500 })
  }

  const hasAdmin = listData.users.some(
    (u) => (u.app_metadata as { role?: string } | undefined)?.role === 'admin'
  )
  if (hasAdmin) {
    return NextResponse.json({ error: 'Admin already exists' }, { status: 409 })
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,        // allow immediate sign-in without email verification
    app_metadata: { role: 'admin' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
