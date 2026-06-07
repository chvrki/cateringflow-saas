'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type RecipeIngredientInput = {
  ingredient_id: string
  quantity: number
  unit: string
}

export type RecipeSubRecipeInput = {
  child_recipe_id: string
  quantity: number
}

export type RecipePayload = {
  name: string
  category: string | null
  servings: number
  notes: string | null
  ingredients: RecipeIngredientInput[]
  sub_recipes: RecipeSubRecipeInput[]
}

export async function createRecipe(data: RecipePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return { error: 'Sin empresa asociada' }

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      name: data.name,
      category: data.category,
      servings: data.servings,
      notes: data.notes,
      tenant_id: profile.tenant_id,
    })
    .select()
    .single()

  if (recipeError || !recipe) return { error: recipeError?.message ?? 'Error creando receta' }

  const [ingRes, subRes] = await Promise.all([
    data.ingredients.length > 0
      ? supabase.from('recipe_ingredients').insert(
          data.ingredients.map((i) => ({ ...i, recipe_id: recipe.id }))
        )
      : Promise.resolve({ error: null }),
    data.sub_recipes.length > 0
      ? supabase.from('recipe_sub_recipes').insert(
          data.sub_recipes.map((s) => ({ ...s, parent_recipe_id: recipe.id }))
        )
      : Promise.resolve({ error: null }),
  ])

  if (ingRes.error) return { error: ingRes.error.message }
  if (subRes.error) return { error: subRes.error.message }

  revalidatePath('/dashboard/recipes')
  return { success: true, id: recipe.id }
}

export async function updateRecipe(id: string, data: RecipePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error: recipeError } = await supabase
    .from('recipes')
    .update({
      name: data.name,
      category: data.category,
      servings: data.servings,
      notes: data.notes,
    })
    .eq('id', id)

  if (recipeError) return { error: recipeError.message }

  // Replace all ingredients and sub-recipes
  const [delIng, delSub] = await Promise.all([
    supabase.from('recipe_ingredients').delete().eq('recipe_id', id),
    supabase.from('recipe_sub_recipes').delete().eq('parent_recipe_id', id),
  ])

  if (delIng.error) return { error: delIng.error.message }
  if (delSub.error) return { error: delSub.error.message }

  const [ingRes, subRes] = await Promise.all([
    data.ingredients.length > 0
      ? supabase.from('recipe_ingredients').insert(
          data.ingredients.map((i) => ({ ...i, recipe_id: id }))
        )
      : Promise.resolve({ error: null }),
    data.sub_recipes.length > 0
      ? supabase.from('recipe_sub_recipes').insert(
          data.sub_recipes.map((s) => ({ ...s, parent_recipe_id: id }))
        )
      : Promise.resolve({ error: null }),
  ])

  if (ingRes.error) return { error: ingRes.error.message }
  if (subRes.error) return { error: subRes.error.message }

  revalidatePath('/dashboard/recipes')
  revalidatePath(`/dashboard/recipes/${id}`)
  return { success: true }
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/recipes')
  redirect('/dashboard/recipes')
}
