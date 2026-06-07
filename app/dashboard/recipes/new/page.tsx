import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecipeEditor } from '../_components/RecipeEditor'
import type { Ingredient, Recipe } from '@/types/database'

export default async function NewRecipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ingredientsRes, recipesRes] = await Promise.all([
    supabase.from('ingredients').select('*').order('name'),
    supabase.from('recipes').select('id, name, servings, category').order('name'),
  ])

  const ingredients = (ingredientsRes.data ?? []) as Ingredient[]
  const recipes = (recipesRes.data ?? []) as Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>[]

  return (
    <RecipeEditor
      mode="new"
      ingredients={ingredients}
      availableRecipes={recipes}
    />
  )
}
