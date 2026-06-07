import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { BookingConfirmationDocument } from '@/lib/pdf/BookingConfirmation'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the booking
    const { data: booking, error: bookingError } = await (supabase
      .from('bookings')
      .select('*, menus(*)')
      .eq('id', params.id)
      .single() as any)

    if (bookingError || !booking) {
      return new NextResponse('Booking not found', { status: 404 })
    }

    // Verify tenant ownership via profile
    const { data: profile } = await (supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single() as any)

    if (profile?.tenant_id !== booking.tenant_id) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Get tenant data
    const { data: tenant } = await (supabase
      .from('tenants')
      .select('*')
      .eq('id', booking.tenant_id)
      .single() as any)

    if (!tenant) {
      return new NextResponse('Tenant not found', { status: 404 })
    }

    // Generate PDF stream
    const stream = await renderToStream(
      BookingConfirmationDocument({
        tenant: {
          name: tenant.name,
          logo_url: tenant.logo_url,
          email: null,
        },
        booking: {
          customer_name: booking.client_name,
          customer_email: booking.client_email,
          customer_phone: booking.client_phone,
          event_date: booking.event_date,
          guests: booking.guests,
          notes: booking.notes,
        },
        menu: {
          name: booking.menus.name,
          description: booking.menus.description,
          price_per_person: booking.menus.price_per_person,
        },
      })
    )

    // @ts-ignore
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: any) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err: any) => controller.error(err))
      },
    })

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reserva-${booking.id}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Error generating PDF:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
