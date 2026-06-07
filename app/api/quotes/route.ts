import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const TAX_RATE = 0.21

const createQuoteSchema = z.object({
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

function toMoney(value: number) {
  return Math.round(value * 100) / 100
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} ha tardado demasiado`)), timeoutMs)
    }),
  ])
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = (await withTimeout(supabase.auth.getUser(), 8000, 'La sesion')) as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = (await withTimeout(
      supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single() as any,
      8000,
      'El perfil',
    )) as any

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 400 })
    }

    const payload = await request.json()
    const parsed = createQuoteSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Datos invalidos' },
        { status: 400 },
      )
    }

    const data = parsed.data
    const tenantId = profile.tenant_id as string

    const { data: menu } = (await withTimeout(
      (supabase.from('menus') as any)
        .select('id, name, price_per_person')
        .eq('id', data.menu_id)
        .eq('tenant_id', tenantId)
        .single(),
      8000,
      'El menu',
    )) as any

    if (!menu) {
      return NextResponse.json(
        { error: 'Menu no encontrado o no autorizado' },
        { status: 404 },
      )
    }

    const pricePerPax = Number(menu.price_per_person ?? 0)
    const subtotal = toMoney(pricePerPax * data.guests)
    const tax_amount = toMoney(subtotal * TAX_RATE)
    const total = toMoney(subtotal + tax_amount)

    const { data: inserted, error: insertError } = (await withTimeout(
      (supabase.from('quotes') as any)
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
          menu_items: [],
          price_per_pax: pricePerPax,
          subtotal,
          tax_rate: TAX_RATE,
          tax_amount,
          total,
          deposit_amount: data.deposit_amount ?? 0,
          valid_until: data.valid_until,
          notes: data.notes || null,
          legal_terms: data.legal_terms || null,
          status: data.action === 'send' ? 'sent' : 'draft',
          accept_token: randomUUID(),
        })
        .select('id')
        .single(),
      8000,
      'El guardado',
    )) as any

    if (insertError || !inserted?.id) {
      return NextResponse.json(
        { error: insertError?.message ?? 'No se pudo crear el presupuesto' },
        { status: 500 },
      )
    }

    return NextResponse.json({ id: inserted.id })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo crear el presupuesto',
      },
      { status: 500 },
    )
  }
}
