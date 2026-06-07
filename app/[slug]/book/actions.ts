'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// SQL para crear la tabla si no existiera (ya existe en este proyecto base):
/*
CREATE TABLE public.bookings (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id) not null,
  menu_id uuid references public.menus(id) not null,
  event_date date,
  guests integer not null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  notes text,
  total_amount numeric default 0,
  deposit_amount numeric default 0,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
*/

const CreateBookingSchema = z.object({
  tenant_id: z.string(),
  menu_id: z.string().min(1, 'Selecciona un menú para continuar'),
  event_date: z.string().refine((date) => {
    return new Date(date) >= new Date(new Date().toISOString().split('T')[0])
  }, { message: 'La fecha no puede ser anterior a hoy' }),
  guests: z.coerce.number().min(1, 'Debe ser al menos 1 persona'),
  client_name: z.string().min(2, 'Ingresa tu nombre completo'),
  client_email: z.string().email('Ingresa un email válido'),
  client_phone: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateBookingResponse = {
  success?: boolean
  error?: string
}

export async function createBooking(data: z.infer<typeof CreateBookingSchema>): Promise<CreateBookingResponse> {
  try {
    const parsed = CreateBookingSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || 'Datos inválidos' }
    }

    const supabase = await createClient()
    const payload = parsed.data

    // 1. Validar servidor: Confirmar que el tenant existe
    const { data: tenant } = await (supabaseAdmin
      .from('tenants')
      .select('id, name, email')
      .eq('id', payload.tenant_id)
      .single() as any)

    if (!tenant) {
      return { error: 'Empresa de catering no válida' }
    }

    // 2. Validar servidor: Confirmar que el menú pertenece al tenant y está activo
    const { data: menu } = await (supabaseAdmin
      .from('menus')
      .select('id, name, price_per_person, active')
      .eq('id', payload.menu_id)
      .eq('tenant_id', payload.tenant_id)
      .single() as any)

    if (!menu || !menu.active) {
      return { error: 'Menú no válido o inactivo' }
    }

    const price = menu.price_per_person || 0
    const total_amount = price * payload.guests

    // 3. Insertar reserva usando Service Role client para saltar RLS en public page
    const { error: insertError } = await (supabaseAdmin
      .from('bookings') as any)
      .insert({
        tenant_id: tenant.id, // hardcoded server-side confirmation
        menu_id: menu.id,
        event_date: payload.event_date,
        guests: payload.guests,
        client_name: payload.client_name,
        client_email: payload.client_email,
        client_phone: payload.client_phone || null,
        notes: payload.notes || null,
        total_amount,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error al insertar reserva:', insertError)
      return { error: 'No se pudo procesar la reserva' }
    }

    // 4. Autodisparo asíncrono confirmando la recepción al cliente
    if (tenant && menu) {
      const { sendBookingReceived } = await import('@/lib/email/send')
      // No bloqueamos a que mande el correo para devolver validación de exito ✅
      void sendBookingReceived(payload, menu, tenant)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error in createBooking:', err)
    return { error: 'Error interno del servidor' }
  }
}
