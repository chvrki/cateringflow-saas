'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function authed() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, supabase, user: null, tenantId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return { error: 'Sin empresa asociada' as const, supabase, user, tenantId: null }
  return { error: null, supabase, user, tenantId: profile.tenant_id }
}

export async function createSupplier(data: {
  name: string
  email?: string | null
  phone?: string | null
  notes?: string | null
}) {
  const { error, supabase, tenantId } = await authed()
  if (error) return { error }

  const { error: dbErr } = await supabase
    .from('suppliers')
    .insert({ ...data, tenant_id: tenantId! } as any)

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/dashboard/suppliers')
  return { success: true }
}

export async function updateSupplier(
  id: string,
  data: Partial<{ name: string; email: string | null; phone: string | null; notes: string | null }>,
) {
  const { error, supabase } = await authed()
  if (error) return { error }

  const { error: dbErr } = await supabase
    .from('suppliers')
    .update(data as any)
    .eq('id', id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/dashboard/suppliers')
  return { success: true }
}

export async function deleteSupplier(id: string) {
  const { error, supabase } = await authed()
  if (error) return { error }

  const { error: dbErr } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/dashboard/suppliers')
  return { success: true }
}
