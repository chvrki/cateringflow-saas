'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const CreateTenantSchema = z.object({
  companyName: z
    .string()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  slug: z
    .string()
    .min(3, { message: 'La URL debe tener al menos 3 caracteres' })
    .regex(/^[a-z0-9-]+$/, {
      message: 'La URL solo puede contener letras minúsculas, números y guiones',
    }),
})

export type CreateTenantResponse = {
  success?: boolean
  error?: string
}

export async function createTenant(data: {
  companyName: string
  slug: string
}): Promise<CreateTenantResponse> {
  try {
    const parsed = CreateTenantSchema.safeParse(data)
    
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || 'Datos inválidos' }
    }

    const { companyName, slug } = parsed.data
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: 'No autorizado' }
    }

    // 1. Check if slug exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingTenant) {
      return { error: 'slug_taken' }
    }

    const { data: newTenant, error: insertError } = await (supabase.from('tenants') as any)
      .insert({
        name: companyName,
        slug,
        owner_id: user.id,
        plan: 'free',
      })
      .select('id')
      .single()

    if (insertError || !newTenant) {
      console.error('Error creating tenant:', insertError)
      return { error: 'Error al crear la empresa' }
    }

    const newTenantId = newTenant.id

    // 3. Update profiles for the user
    const { error: profileError } = await (supabase.from('profiles') as any)
      .update({ tenant_id: newTenantId })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return { error: 'Error al vincular el perfil' }
    }

    // 4. Set cookie cf_tenant_id
    cookies().set('cf_tenant_id', newTenantId, { 
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in createTenant:', err)
    return { error: 'Error interno del servidor' }
  }
}
