'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createIngredient(data: {
  name: string
  unit: string
  cost_per_unit: number
  waste_percentage: number
  supplier: string | null
  notes: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return { error: 'Sin empresa asociada' }

  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .insert({ ...data, tenant_id: profile.tenant_id })
    .select()
    .single()

  if (error) return { error: error.message }

  // Record initial price history
  await supabase.from('ingredient_price_history').insert({
    ingredient_id: ingredient.id,
    cost_per_unit: data.cost_per_unit,
  })

  revalidatePath('/dashboard/ingredients')
  return { success: true }
}

export async function updateIngredient(
  id: string,
  data: Partial<{
    name: string
    unit: string
    cost_per_unit: number
    waste_percentage: number
    supplier: string | null
    notes: string | null
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('ingredients')
    .update(data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/ingredients')
  return { success: true }
}

export async function updateIngredientCost(id: string, cost_per_unit: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [updateRes] = await Promise.all([
    supabase.from('ingredients').update({ cost_per_unit }).eq('id', id),
    supabase.from('ingredient_price_history').insert({ ingredient_id: id, cost_per_unit }),
  ])

  if (updateRes.error) return { error: updateRes.error.message }

  revalidatePath('/dashboard/ingredients')
  return { success: true }
}

export async function deleteIngredient(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/ingredients')
  return { success: true }
}
