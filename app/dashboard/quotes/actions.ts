'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const TAX_RATE = 0.21

const quoteSchema = z.object({
  client_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  client_email: z.string().email('Email no valido'),
  client_phone: z.string().optional(),
  event_type: z.string().optional(),
  event_date: z.string().min(1, 'La fecha del evento es obligatoria'),
  guests: z.coerce.number().min(1, 'Debe haber al menos 1 persona'),
  location: z.string().optional(),
  menu_id: z.string().uuid('Selecciona un menu'),
  valid_until: z.string().min(1, 'Indica la fecha de validez'),
  deposit_amount: z.coerce.number().min(0).optional(),
  legal_terms: z.string().optional(),
  notes: z.string().optional(),
  action: z.enum(['draft', 'send']).default('draft'),
})

const updateQuoteSchema = quoteSchema.omit({ action: true, menu_id: true }).partial()

type ActionResult = { error?: string; success?: boolean }

function toMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getEconomics(pricePerPax: number, guests: number) {
  const subtotal = toMoney(pricePerPax * guests)
  const tax_amount = toMoney(subtotal * TAX_RATE)
  const total = toMoney(subtotal + tax_amount)
  return { subtotal, tax_rate: TAX_RATE, tax_amount, total }
}

async function getTenantId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, error: 'No autenticado' }

  const { data: profile } = await (supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any)

  if (!profile?.tenant_id) return { supabase, error: 'Tenant no encontrado' }

  return { supabase, tenantId: profile.tenant_id }
}

export async function createQuote(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const auth = await getTenantId()
  if (auth.error || !auth.tenantId) return { error: auth.error }

  const parsed = quoteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const { supabase, tenantId } = auth
  const data = parsed.data

  const { data: menu } = await (supabase
    .from('menus') as any)
    .select('id, name, price_per_person, menu_items(*)')
    .eq('id', data.menu_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) return { error: 'Menu no encontrado o no autorizado' }

  const pricePerPax = Number(menu.price_per_person ?? 0)
  const economics = getEconomics(pricePerPax, data.guests)
  const status = data.action === 'send' ? 'sent' : 'draft'

  const { data: inserted, error: insertError } = await (supabase
    .from('quotes') as any)
    .insert({
      tenant_id: tenantId,
      client_name: data.client_name,
      client_email: data.client_email,
      client_phone: data.client_phone || null,
      event_type: data.event_type || null,
      event_date: data.event_date,
      guests: data.guests,
      location: data.location || null,
      menu_id: data.menu_id,
      menu_name: menu.name,
      menu_items: menu.menu_items ?? [],
      price_per_pax: pricePerPax,
      ...economics,
      deposit_amount: data.deposit_amount ?? 0,
      valid_until: data.valid_until,
      notes: data.notes || null,
      legal_terms: data.legal_terms || null,
      status,
      accept_token: randomUUID(),
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    return { error: insertError?.message ?? 'No se pudo crear el presupuesto' }
  }

  revalidatePath('/dashboard/quotes')
  return { success: true, id: inserted.id }
}

export async function updateQuote(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await getTenantId()
  if (auth.error || !auth.tenantId) return { error: auth.error }

  const parsed = updateQuoteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const { supabase, tenantId } = auth
  const { data: existing } = await (supabase
    .from('quotes') as any)
    .select('id, status, price_per_pax')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return { error: 'Presupuesto no encontrado' }
  if (existing.status !== 'draft') {
    return { error: 'Solo se pueden editar presupuestos en borrador' }
  }

  const data = parsed.data
  const economics =
    data.guests !== undefined
      ? getEconomics(Number(existing.price_per_pax ?? 0), data.guests)
      : {}

  const { error: updateError } = await (supabase
    .from('quotes') as any)
    .update({
      ...data,
      ...economics,
      client_phone: data.client_phone || null,
      event_type: data.event_type || null,
      location: data.location || null,
      notes: data.notes || null,
      legal_terms: data.legal_terms || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/quotes')
  revalidatePath(`/dashboard/quotes/${id}`)
  return { success: true }
}

export async function sendQuote(id: string): Promise<ActionResult> {
  const auth = await getTenantId()
  if (auth.error || !auth.tenantId) return { error: auth.error }

  const { data: quote } = await (auth.supabase
    .from('quotes') as any)
    .select('id, client_name, client_email, menu_name, total, accept_token')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (!quote) return { error: 'Presupuesto no encontrado' }

  const { error: updateError } = await (auth.supabase
    .from('quotes') as any)
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .in('status', ['draft', 'sent'])

  if (updateError) return { error: updateError.message }

  if (process.env.RESEND_API_KEY && quote.client_email) {
    try {
      const { resend } = await import('@/lib/email/resend')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const publicUrl = quote.accept_token
        ? `${appUrl}/quotes/${quote.accept_token}`
        : appUrl

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: quote.client_email,
        subject: `Tu presupuesto de catering - ${quote.menu_name ?? 'Caterix'}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="color: #92400e;">Hola ${quote.client_name},</h1>
            <p>Te enviamos tu presupuesto de catering.</p>
            <p><strong>Menu:</strong> ${quote.menu_name ?? '-'}</p>
            <p><strong>Total:</strong> ${new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(quote.total ?? 0)}</p>
            <p>
              <a href="${publicUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
                Ver presupuesto
              </a>
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.error('Error sending quote email:', error)
    }
  }

  revalidatePath('/dashboard/quotes')
  revalidatePath(`/dashboard/quotes/${id}`)
  return { success: true }
}

export async function duplicateQuote(id: string): Promise<ActionResult | never> {
  const auth = await getTenantId()
  if (auth.error || !auth.tenantId) return { error: auth.error }

  const { supabase, tenantId } = auth
  const { data: original } = await (supabase
    .from('quotes') as any)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!original) return { error: 'Presupuesto no encontrado' }

  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    accepted_at: _acceptedAt,
    accept_token: _acceptToken,
    status: _status,
    ...copy
  } = original

  const { data: inserted, error: insertError } = await (supabase
    .from('quotes') as any)
    .insert({
      ...copy,
      status: 'draft',
      accepted_at: null,
      accept_token: randomUUID(),
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    return { error: insertError?.message ?? 'No se pudo duplicar' }
  }

  revalidatePath('/dashboard/quotes')
  redirect(`/dashboard/quotes/${inserted.id}`)
}

export async function deleteQuote(id: string): Promise<ActionResult | never> {
  const auth = await getTenantId()
  if (auth.error || !auth.tenantId) return { error: auth.error }

  const { supabase, tenantId } = auth
  const { data: existing } = await (supabase
    .from('quotes') as any)
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return { error: 'Presupuesto no encontrado' }
  if (!['draft', 'rejected', 'expired'].includes(existing.status)) {
    return { error: 'No se puede eliminar un presupuesto enviado o aceptado' }
  }

  const { error: deleteError } = await (supabase
    .from('quotes') as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath('/dashboard/quotes')
  redirect('/dashboard/quotes')
}
