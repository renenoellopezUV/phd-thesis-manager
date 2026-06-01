'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isValidLocale, type Locale } from '@/lib/locale'

export async function updateLocale(locale: Locale): Promise<{ error?: string }> {
  if (!isValidLocale(locale)) return { error: 'Invalid locale' }

  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email ?? '', locale })
    if (error) return { error: error.message }
  }

  return {}
}
