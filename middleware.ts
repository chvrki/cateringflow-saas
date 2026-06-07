import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

/**
 * Middleware principal de Next.js.
 *
 * La lógica de:
 * - refrescar sesión de Supabase (@supabase/ssr)
 * - leer tenant_id desde JWT (session.user.app_metadata.tenant_id)
 * - fallback a profiles si no está en el JWT
 * - setear la cookie `cf_tenant_id`
 * - proteger /dashboard/* (auth requerida) y /admin/* (role admin_catering)
 * - redirecciones con ?redirectTo=
 *
 * está implementada en `updateSession` siguiendo patterns de supabase-auth
 * + middleware-patterns multi-tenant.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Aplica middleware solo donde lo necesitamos, excluyendo estáticos, assets y webhooks de Stripe.
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhooks/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}

