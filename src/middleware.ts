// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const AUTH_ROUTES = new Set(['/login', '/verify-email', '/auth/confirm'])
const ADVISOR_PREFIX = '/advisor'
const ADMIN_PREFIX = '/admin'

async function adminExists(): Promise<boolean> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error || !data) return true // fail open
    return data.users.some(
      (u) => (u.app_metadata as { role?: string } | undefined)?.role === 'admin'
    )
  } catch {
    return true // fail open
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Setup guard ───────────────────────────────────────────────────────────
  // When ADMIN_BOOTSTRAPPED=true, skip entirely — zero cost in production.
  // Checks Supabase directly (no internal fetch) so it works reliably on Netlify Edge.
  if (!process.env.ADMIN_BOOTSTRAPPED && !pathname.startsWith('/api/setup-admin')) {
    try {
      const exists = await adminExists()

      if (!exists) {
        if (pathname === '/setup') {
          // No admin yet — allow /setup to load, skip all auth checks below
          return NextResponse.next({ request })
        }
        // Any other route — redirect to setup
        return NextResponse.redirect(new URL('/setup', request.url))
      }
    } catch {
      // Fail open — if already on /setup, allow it through
      if (pathname === '/setup') {
        return NextResponse.next({ request })
      }
    }
  }

  // /setup is only valid during bootstrap; redirect away once an admin exists
  // (also handles the case where ADMIN_BOOTSTRAPPED is set and user visits /setup)
  if (pathname === '/setup') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  // ── End setup guard ───────────────────────────────────────────────────────

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = AUTH_ROUTES.has(pathname)

  // Unauthenticated: redirect to login (except auth routes)
  if (!user && !isAuthRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    // Authenticated users visiting login → send to app
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Email verification check (skip /verify-email and /auth/confirm)
    if (!isAuthRoute && !user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // Role-based guards (read from admin-controlled app_metadata)
    const role = (user.app_metadata as { role?: UserRole } | undefined)?.role ?? 'student'

    if (pathname.startsWith(ADVISOR_PREFIX) && role !== 'advisor') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
