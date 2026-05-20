'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email ?? '',
      name: (formData.get('name') as string | null)?.trim() ?? '',
      advisor_email: (formData.get('advisorEmail') as string | null)?.trim() || null,
      department: (formData.get('department') as string | null)?.trim() || null,
      program: (formData.get('program') as string | null)?.trim() || null,
      start_date: (formData.get('startDate') as string | null) || null,
      expected_graduation: (formData.get('expectedGraduation') as string | null) || null,
      stage: (formData.get('stage') as string | null) ?? 'coursework',
    })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/profile')
  return {}
}
