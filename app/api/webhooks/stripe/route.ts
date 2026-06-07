import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

const getServiceRoleClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('Missing stripe signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = getServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabase
        )
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabase
        )
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        )
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error)
    // Return 200 so Stripe doesn't retry unnecessarily for DB errors
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof getServiceRoleClient>
) {
  const tenantId = session.metadata?.tenant_id

  if (!tenantId) {
    console.error('No tenant_id in session metadata')
    return
  }

  const updateData: any = {
    plan: 'pro',
  }

  if (session.customer) {
    updateData.stripe_customer_id = session.customer.toString()
  }

  if (session.subscription) {
    updateData.stripe_subscription_id = session.subscription.toString()
  }

  const { error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)

  if (error) {
    throw new Error(`Failed to update tenant ${tenantId}: ${error.message}`)
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof getServiceRoleClient>
) {
  const status = subscription.status
  let plan = 'pro'

  if (status === 'past_due' || status === 'unpaid') {
    plan = 'past_due'
  }

  // Si cancelada o activa, ajustar:
  // (Nota: si ya se canceló de forma definitiva entra en deleted)
  
  const { error } = await supabase
    .from('tenants')
    .update({ plan: plan as "free" | "pro" | "enterprise" })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw new Error(
      `Failed to update tenant for subscription ${subscription.id}: ${error.message}`
    )
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof getServiceRoleClient>
) {
  const customerId = subscription.customer.toString()

  const { error } = await supabase
    .from('tenants')
    .update({
      plan: 'free',
      stripe_subscription_id: null,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    throw new Error(
      `Failed to downgrade tenant for customer ${customerId}: ${error.message}`
    )
  }
}
