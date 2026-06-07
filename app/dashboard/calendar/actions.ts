'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid_full'
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'No autenticado' }
    }

    // Single update — RLS ensures the user can only update their own tenant's bookings.
    // .select('id').single() lets us detect if RLS blocked it (data === null → 0 rows updated).
    const { data, error: updateError } = await (supabase
      .from('bookings') as any)
      .update({ status })
      .eq('id', bookingId)
      .select('id')
      .single()

    if (updateError || !data) {
      console.error('Error updating booking:', updateError)
      return { error: 'No se pudo actualizar la reserva' }
    }

    if (status === 'confirmed') {
      try {
        const { data: expanded } = await (supabase
          .from('bookings')
          .select('*, menus(*), tenants(*)')
          .eq('id', bookingId)
          .single() as any)

        if (expanded?.menus && expanded?.tenants) {
          const { sendBookingConfirmed } = await import('@/lib/email/send')
          void sendBookingConfirmed(expanded, expanded.menus, expanded.tenants)
        }
      } catch (err) {
        console.error('Error enviando reserva confirmada con PDF', err)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in updateBookingStatus:', error)
    return { error: 'Error interno del servidor' }
  }
}
