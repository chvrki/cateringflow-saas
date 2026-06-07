'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function authed() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, supabase, user: null, tenantId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id)
    return { error: 'Sin empresa asociada' as const, supabase, user, tenantId: null }
  return { error: null, supabase, user, tenantId: profile.tenant_id }
}

export async function createOrder(data: {
  supplierId: string
  notes?: string
  items: {
    ingredientId: string
    quantityOrdered: number
    unit: string
    unitPrice?: number | null
    notes?: string | null
  }[]
}): Promise<{ error: string } | { success: true; id: string }> {
  const { error, supabase, tenantId } = await authed()
  if (error) return { error }

  const { data: order, error: orderErr } = await (supabase as any)
    .from('purchase_orders')
    .insert({
      tenant_id: tenantId,
      supplier_id: data.supplierId,
      notes: data.notes || null,
    })
    .select('id')
    .single()

  if (orderErr) return { error: orderErr.message }

  if (data.items.length > 0) {
    const rows = data.items.map((item) => ({
      purchase_order_id: order.id,
      ingredient_id: item.ingredientId,
      quantity_ordered: item.quantityOrdered,
      unit: item.unit,
      unit_price: item.unitPrice ?? null,
      notes: item.notes ?? null,
    }))

    const { error: itemsErr } = await (supabase as any)
      .from('purchase_order_items')
      .insert(rows)

    if (itemsErr) return { error: itemsErr.message }
  }

  revalidatePath('/dashboard/orders')
  return { success: true, id: order.id }
}

export async function updateOrderStatus(
  id: string,
  status: 'enviado' | 'cancelado',
): Promise<{ error: string } | { success: true }> {
  const { error, supabase } = await authed()
  if (error) return { error }

  const patch: Record<string, unknown> = { status }
  if (status === 'enviado') patch.sent_at = new Date().toISOString()

  const { error: dbErr } = await (supabase as any)
    .from('purchase_orders')
    .update(patch)
    .eq('id', id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/dashboard/orders/${id}`)
  revalidatePath('/dashboard/orders')
  return { success: true }
}

export async function receiveOrder(
  orderId: string,
  items: { itemId: string; ingredientId: string; quantityReceived: number; unit: string }[],
): Promise<{ error: string } | { success: true }> {
  const { error, supabase, tenantId, user } = await authed()
  if (error) return { error }

  // Update each line's quantity_received
  for (const item of items) {
    const { error: lineErr } = await (supabase as any)
      .from('purchase_order_items')
      .update({ quantity_received: item.quantityReceived })
      .eq('id', item.itemId)

    if (lineErr) return { error: lineErr.message }
  }

  // Insert stock movements for lines with qty > 0
  const movements = items
    .filter((i) => i.quantityReceived > 0)
    .map((i) => ({
      tenant_id: tenantId,
      ingredient_id: i.ingredientId,
      type: 'entrada',
      quantity: i.quantityReceived,
      reason: 'compra',
      notes: `Pedido ${orderId}`,
      created_by: user!.id,
    }))

  if (movements.length > 0) {
    const { error: movErr } = await (supabase as any)
      .from('stock_movements')
      .insert(movements)

    if (movErr) return { error: movErr.message }

    // Update stock_quantity for each ingredient
    for (const item of items.filter((i) => i.quantityReceived > 0)) {
      const { data: ing } = await (supabase as any)
        .from('ingredients')
        .select('stock_quantity')
        .eq('id', item.ingredientId)
        .single()

      const current = (ing as any)?.stock_quantity ?? 0
      await (supabase as any)
        .from('ingredients')
        .update({ stock_quantity: current + item.quantityReceived })
        .eq('id', item.ingredientId)
    }
  }

  // Mark order as received
  const { error: orderErr } = await (supabase as any)
    .from('purchase_orders')
    .update({ status: 'recibido', received_at: new Date().toISOString() })
    .eq('id', orderId)

  if (orderErr) return { error: orderErr.message }

  revalidatePath(`/dashboard/orders/${orderId}`)
  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard')
  return { success: true }
}
