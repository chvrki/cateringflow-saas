import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const redirectTo = url.searchParams.get('redirectTo')

  if (!code) {
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('error', 'missing-code')
    return NextResponse.redirect(loginUrl)
  }

  let response = NextResponse.redirect(
    redirectTo && redirectTo !== '/' ? redirectTo : '/dashboard'
  )

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('error', 'oauth-failed')
    loginUrl.searchParams.set('message', error.message)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

