import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database, Profile } from '@/types/database'

const PUBLIC_API_ROUTES = [
  '/api/webhooks/stripe', // Stripe webhook — must be public
]

function isProtectedPath(pathname: string) {
  // Existing dashboard/admin protection
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return true
  }

  // Protect all /api/ routes except explicitly public ones
  if (pathname.startsWith('/api/')) {
    return !PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
  }

  return false
}

function isAdminPath(pathname: string) {
  return pathname.startsWith('/admin')
}

function isAuthPage(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth')
  )
}

function isOnboardingPage(pathname: string) {
  return pathname === '/onboarding'
}

export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  const initialResponse = NextResponse.next({ request })
  let supabaseResponse = initialResponse

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          supabaseResponse = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  let profile: Profile | null = null
  let tenantId = request.cookies.get('cf_tenant_id')?.value || null

  // 1) Si estamos logueados pero la cookie no existe, consultamos profiles
  if (user && !tenantId) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileRow) {
      profile = profileRow as Profile
      if (profile.tenant_id) {
        tenantId = profile.tenant_id
      }
    }
  } else if (user && isAdminPath(pathname)) {
    // Si la cookie existe pero vamos a /admin, necesitamos cargar el profile para ver el rol
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profileRow) {
      profile = profileRow as Profile
    }
  }

  // Seteamos cookie cf_tenant_id si logramos obtener el tenantId de la db
  if (tenantId) {
    supabaseResponse.cookies.set('cf_tenant_id', tenantId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  // --- LÓGICA DE ENRUTAMIENTO ---

  if (!user) {
    // Invitados
    if (isProtectedPath(pathname) || isOnboardingPage(pathname)) {
      // For API routes, return 401 instead of redirecting
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      url.pathname = '/login'
      if (isProtectedPath(pathname)) {
        url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
      }
      return NextResponse.redirect(url)
    }
  } else {
    // Autenticados
    if (!tenantId) {
      // Sin tenant_id: Obligar onboarding
      if (isProtectedPath(pathname)) {
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
      // Se permite /onboarding, /login, /signup o /
    } else {
      // Con tenant_id: Todo listo
      if (isAuthPage(pathname) || isOnboardingPage(pathname)) {
        url.pathname = '/dashboard'
        url.searchParams.delete('redirectTo')
        return NextResponse.redirect(url)
      }
      
      // Control de roles (si va a /admin)
      if (isAdminPath(pathname) && profile?.role !== 'admin_catering') {
        url.pathname = '/dashboard'
        url.searchParams.set('error', 'access-denied')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
