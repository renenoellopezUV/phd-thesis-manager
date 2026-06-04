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

  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(studentId)
  if (userError) return { error: userError.message }
  if (!user) return { error: 'User not found' }

  const { error } = await admin
    .from('profiles')
    .upsert(
      { id: studentId, email: user.email ?? '', advisor_id: advisorId || null },
      { onConflict: 'id' }
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }
  return {}
}

export async function verifyUserEmail(
  userId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  // @ts-expect-error — email_confirm is valid per Supabase Admin API
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
