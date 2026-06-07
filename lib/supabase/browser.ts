import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Supabase client-side (para Client Components / hooks).
 */
export function createBrowserClient() {
  return createBrowserClientSSR<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


