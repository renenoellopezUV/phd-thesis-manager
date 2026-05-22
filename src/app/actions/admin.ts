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
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
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
