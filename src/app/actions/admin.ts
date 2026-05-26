'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'

export async function changeUserRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })
  if (error) return { error: error.message }
  return {}
}

export async function inviteUser(
  email: string,
  role: UserRole,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  // NEXT_PUBLIC_SITE_URL must be set per environment:
  //   .env.local        → http://localhost:3000
  //   Netlify env vars  → https://your-app.netlify.app
  // This ensures confirmation emails link to the right host, not whatever
  // Supabase's "Site URL" is configured to.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const redirectTo = `${siteUrl}/auth/confirm`
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function assignAdvisor(
  studentId: string,
  advisorId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ advisor_id: advisorId || null })
    .eq('id', studentId)

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
