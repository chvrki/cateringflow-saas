'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, supabase, user: null, tenantId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return { error: 'Sin empresa asociada' as const, supabase, user, tenantId: null }

  return { error: null, supabase, user, tenantId: profile.tenant_id }
}

export async function registerMovement(
  ingredientId: string,
  type: 'entrada' | 'salida' | 'ajuste',
  quantity: number,   // always positive from the UI
  reason: string,
  notes?: string,
  eventId?: string,
) {
  const { error, supabase, user, tenantId } = await getAuthedClient()
  if (error) return { error }

  // Signed quantity stored in the log: entrada=positive, salida=negative, ajuste=absolute
  const logQty = type === 'salida' ? -Math.abs(quantity) : Math.abs(quantity)

  const { error: movErr } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId!,
      ingredient_id: ingredientId,
      type,
      quantity: logQty,
      reason: reason || null,
      event_id: eventId || null,
      notes: notes?.trim() || null,
      created_by: user!.id,
    } as any)

  if (movErr) return { error: movErr.message }

  // Update stock_quantity — two sequential awaits (low concurrency acceptable for catering SaaS)
  if (type === 'ajuste') {
    const { error: updErr } = await supabase
      .from('ingredients')
      .update({ stock_quantity: Math.abs(quantity) } as any)
      .eq('id', ingredientId)
    if (updErr) return { error: updErr.message }
  } else {
    const { data: ing, error: fetchErr } = await supabase
      .from('ingredients')
      .select('stock_quantity')
      .eq('id', ingredientId)
      .single()
    if (fetchErr) return { error: fetchErr.message }

    const newQty = Number((ing as any).stock_quantity) + logQty
    const { error: updErr } = await supabase
      .from('ingredients')
      .update({ stock_quantity: newQty } as any)
      .eq('id', ingredientId)
    if (updErr) return { error: updErr.message }
  }

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function adjustInventory(
  adjustments: { ingredientId: string; newQuantity: number }[],
) {
  const { error, supabase, user, tenantId } = await getAuthedClient()
  if (error) return { error }

  for (const { ingredientId, newQuantity } of adjustments) {
    const { error: movErr } = await supabase
      .from('stock_movements')
      .insert({
        tenant_id: tenantId!,
        ingredient_id: ingredientId,
        type: 'ajuste',
        quantity: newQuantity,
        reason: 'ajuste_inventario',
        created_by: user!.id,
      } as any)
    if (movErr) return { error: movErr.message }

    const { error: updErr } = await supabase
      .from('ingredients')
      .update({ stock_quantity: newQuantity } as any)
      .eq('id', ingredientId)
    if (updErr) return { error: updErr.message }
  }

  revalidatePath('/dashboard/stock')
  return { success: true }
}
