import { resend } from './resend'
import { renderBookingReceivedEmail } from './templates/BookingReceived'
import { renderBookingConfirmedEmail } from './templates/BookingConfirmed'
import { renderToBuffer } from '@react-pdf/renderer'
import { BookingConfirmationDocument } from '../pdf/BookingConfirmation'

const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export async function sendBookingReceived(booking: any, menu: any, tenant: any) {
  console.log('Sending booking received email to:', booking.client_email ?? booking.customer_email)

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping BookingReceived email.')
    return
  }

  try {
    const html = renderBookingReceivedEmail({
      customerName: booking.client_name ?? booking.customer_name,
      menuName: menu.name,
      guests: booking.guests,
      eventDate: booking.event_date,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
    })

    const { error } = await resend.emails.send({
      from,
      to: booking.client_email ?? booking.customer_email,
      subject: `Hemos recibido tu reserva — ${tenant.name}`,
      html,
    })

    if (error) console.error('Resend error:', error)
  } catch (err) {
    console.error('Failed to send booking received email:', err)
  }
}

export async function sendBookingConfirmed(booking: any, menu: any, tenant: any) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping BookingConfirmed email.')
    return
  }

  try {
    const html = renderBookingConfirmedEmail({
      customerName: booking.client_name ?? booking.customer_name,
      menuName: menu.name,
      guests: booking.guests,
      totalAmount: menu.price_per_person * booking.guests,
      eventDate: booking.event_date,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
    })

    const pdfBuffer = await renderToBuffer(
      BookingConfirmationDocument({
        tenant: {
          name: tenant.name,
          logo_url: tenant.logo_url,
          email: tenant.email,
        },
        booking: {
          customer_name: booking.client_name ?? booking.customer_name,
          customer_email: booking.client_email ?? booking.customer_email,
          customer_phone: booking.client_phone ?? booking.customer_phone,
          event_date: booking.event_date,
          guests: booking.guests,
          notes: booking.notes,
        },
        menu: {
          name: menu.name,
          description: menu.description,
          price_per_person: menu.price_per_person,
        },
      })
    )

    const { error } = await resend.emails.send({
      from,
      to: booking.client_email ?? booking.customer_email,
      subject: `¡Reserva confirmada! — ${tenant.name}`,
      html,
      attachments: [
        {
          filename: `confirmacion-${booking.id}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    if (error) console.error('Resend error:', error)
  } catch (err) {
    console.error('Failed to send booking confirmed email:', err)
  }
}
