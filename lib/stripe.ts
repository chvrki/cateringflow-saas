import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export const DEPOSIT_PERCENTAGE = 0.30

/**
 * Create a Stripe checkout session for a booking deposit (30%)
 */
export async function createDepositCheckoutSession({
  bookingId,
  tenantId,
  tenantSlug,
  menuName,
  guests,
  depositAmountCents,
  customerEmail,
}: {
  bookingId: string
  tenantId: string
  tenantSlug: string
  menuName: string
  guests: number
  depositAmountCents: number
  customerEmail: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Depósito reserva – ${menuName}`,
            description: `30% de depósito para ${guests} personas`,
          },
          unit_amount: depositAmountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      tenant_id: tenantId,
      payment_type: 'deposit',
    },
    success_url: `${baseUrl}/${tenantSlug}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/${tenantSlug}/book`,
  })

  return session
}

/**
 * Create a Stripe checkout session for the remaining 70% balance
 */
export async function createFinalPaymentCheckoutSession({
  bookingId,
  tenantId,
  tenantSlug,
  menuName,
  guests,
  remainingAmountCents,
  customerEmail,
}: {
  bookingId: string
  tenantId: string
  tenantSlug: string
  menuName: string
  guests: number
  remainingAmountCents: number
  customerEmail: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Pago final – ${menuName}`,
            description: `Saldo restante para ${guests} personas`,
          },
          unit_amount: remainingAmountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      tenant_id: tenantId,
      payment_type: 'final',
    },
    success_url: `${baseUrl}/${tenantSlug}/booking/success?session_id={CHECKOUT_SESSION_ID}&type=final`,
    cancel_url: `${baseUrl}/${tenantSlug}/booking/${bookingId}`,
  })

  return session
}
