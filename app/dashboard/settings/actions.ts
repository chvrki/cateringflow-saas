'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
})

export async function updateTenantProfile(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autenticado' }

    const { data: profile } = await (supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single() as any)

    const tenantId = profile?.tenant_id
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const rawName = formData.get('name') as string
    const rawSlug = formData.get('slug') as string
    const file = formData.get('logo') as File | null

    const parsed = updateProfileSchema.safeParse({ name: rawName, slug: rawSlug })
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message }
    }

    const { name, slug } = parsed.data

    // Check slug collision
    const { data: existing } = await (supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .neq('id', tenantId)
      .maybeSingle() as any)

    if (existing) {
      return { error: 'Ese slug ya está en uso' }
    }

    let logoUrl = undefined

    // Upload logo if provided
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()
      const filePath = `${tenantId}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Error al subir el logo' }
      }

      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      logoUrl = publicUrlData.publicUrl + '?t=' + Date.now() // to bust cache
    }

    // Update tenant
    const updatePayload: any = { name, slug }
    if (logoUrl) updatePayload.logo_url = logoUrl

    const { error: updateError } = await (supabase.from('tenants') as any)
      .update(updatePayload)
      .eq('id', tenantId)

    if (updateError) {
      console.error('Update tenant error:', updateError)
      return { error: 'Error al actualizar el perfil' }
    }

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err) {
    console.error('updateTenantProfile err:', err)
    return { error: 'Error de servidor' }
  }
}

export async function createCheckoutSession() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
  })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')

  const { data: profile } = await (supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any)

  const tenantId = profile?.tenant_id
  if (!tenantId) throw new Error('No tenant')

  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID no configurado')
  }

  const originUrl = headers().get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${originUrl}/dashboard/settings?checkout=success`,
    cancel_url: `${originUrl}/dashboard/settings?checkout=cancelled`,
    client_reference_id: tenantId,
    metadata: {
      tenant_id: tenantId,
    },
  })

  if (session.url) {
    redirect(session.url)
  }
}

export async function createPortalSession() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
  })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')

  const { data: profile } = await (supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any)

  const tenantId = profile?.tenant_id
  const { data: tenant } = await (supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single() as any)

  if (!tenant?.stripe_customer_id) {
    throw new Error('No tienes un cliente Stripe vinculado. Contacta a soporte.')
  }

  const originUrl = headers().get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${originUrl}/dashboard/settings`,
  })

  if (portalSession.url) {
    redirect(portalSession.url)
  }
}
