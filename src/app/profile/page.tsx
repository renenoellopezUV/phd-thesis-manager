import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const t = await getTranslations('profile')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? 'student'

  const [{ data: profile }, { data: programs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('programs').select('id, name').order('name'),
  ])

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-lg font-semibold">{t('title')}</h1>
      <ProfileForm profile={profile} programs={programs ?? []} role={role} />
    </div>
  )
}
