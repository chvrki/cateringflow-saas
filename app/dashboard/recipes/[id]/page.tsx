import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { RecipeEditor } from '../_components/RecipeEditor'
import type { Ingredient, Recipe, RecipeIngredient, RecipeSubRecipe } from '@/types/database'

type RecipeIngredientWithIngredient = RecipeIngredient & { ingredients: Ingredient }
type RecipeSubRecipeWithChild = RecipeSubRecipe & { recipes: Pick<Recipe, 'id' | 'name' | 'servings' | 'category'> }

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recipeRes, ingredientsRes, recipesRes, recipeIngsRes, subRecipesRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', id).single(),
    supabase.from('ingredients').select('*').order('name'),
    supabase.from('recipes').select('id, name, servings, category').neq('id', id).order('name'),
    supabase.from('recipe_ingredients').select('*, ingredients(*)').eq('recipe_id', id),
    supabase.from('recipe_sub_recipes').select('*, recipes(id, name, servings, category)').eq('parent_recipe_id', id),
  ])

  if (!recipeRes.data) notFound()

  const recipe = recipeRes.data as Recipe
  const ingredients = (ingredientsRes.data ?? []) as Ingredient[]
  const availableRecipes = (recipesRes.data ?? []) as Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>[]
  const recipeIngredients = (recipeIngsRes.data ?? []) as unknown as RecipeIngredientWithIngredient[]
  const subRecipes = (subRecipesRes.data ?? []) as unknown as RecipeSubRecipeWithChild[]

  return (
    <RecipeEditor
      mode="edit"
      recipe={recipe}
      ingredients={ingredients}
      availableRecipes={availableRecipes}
      initialIngredients={recipeIngredients}
      initialSubRecipes={subRecipes}
    />
  )
}
