'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getUserRole, ROLE_LABELS } from '@/types'
import LanguageSwitcher from './LanguageSwitcher'

function linkClass(href: string, pathname: string) {
  const active = pathname === href || pathname.startsWith(href + '/')
  return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    active
      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
  }`
}

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const role = user ? getUserRole(user) : null

  const links = [
    { href: '/', label: t('dashboard') },
    { href: '/milestones', label: t('milestones') },
    { href: '/timeline', label: t('timeline') },
  ]

  return (
    <nav className="flex items-center gap-1 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <span className="mr-4 font-semibold text-sm text-zinc-800 dark:text-zinc-100 shrink-0">
        {t('appName')}
      </span>

      {links.map(({ href, label }) => (
        <Link key={href} href={href} className={linkClass(href, pathname)}>
          {label}
        </Link>
      ))}

      {role === 'admin' && (
        <Link href="/admin/programs" className={linkClass('/admin/programs', pathname)}>
          {t('programs')}
        </Link>
      )}
      {role === 'admin' && (
        <Link href="/admin/users" className={linkClass('/admin/users', pathname)}>
          {t('users')}
        </Link>
      )}
      {role === 'advisor' && (
        <Link href="/advisor/students" className={linkClass('/advisor/students', pathname)}>
          {t('students')}
        </Link>
      )}

      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitcher />
        {user ? (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-tight">
                {user.email}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {ROLE_LABELS[getUserRole(user)]}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              {t('signOut')}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {t('signIn')}
          </Link>
        )}
      </div>
    </nav>
  )
}
