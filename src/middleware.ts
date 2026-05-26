// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const AUTH_ROUTES = new Set(['/login', '/verify-email', '/auth/confirm'])
// These routes implement the setup check/creation — exclude them from the guard
// to prevent the middleware's own fetch('/api/check-admin') from re-entering this block
const SETUP_API_ROUTES = new Set(['/api/check-admin', '/api/setup-admin'])
const ADVISOR_PREFIX = '/advisor'
const ADMIN_PREFIX = '/admin'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Setup guard ───────────────────────────────────────────────────────────
  // When ADMIN_BOOTSTRAPPED=true, skip entirely — zero cost in production.
  if (!process.env.ADMIN_BOOTSTRAPPED && !SETUP_API_ROUTES.has(pathname)) {
    try {
      const checkRes = await fetch(new URL('/api/check-admin', request.url))
      const { exists } = await checkRes.json() as { exists: boolean }

      if (!exists) {
        if (pathname === '/setup') {
          // No admin yet — allow /setup to load, skip all auth checks below
          return NextResponse.next({ request })
        }
        // Any other route — redirect to setup
        return NextResponse.redirect(new URL('/setup', request.url))
      }
    } catch {
      // Fail open — network or Supabase error.
      // If already on /setup, allow the page to load (form will error on submit).
      // For all other routes, proceed with normal auth flow.
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
