import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ClipboardList } from 'lucide-react'
import type { Recipe, RecipeIngredient, Ingredient, RecipeSubRecipe } from '@/types/database'

type RecipeIngredientWithIngredient = RecipeIngredient & { ingredients: Ingredient }

const CATEGORY_LABELS: Record<string, string> = {
  entrante: 'Entrante',
  primer: 'Primer plato',
  segundo: 'Segundo plato',
  postre: 'Postre',
  bebida: 'Bebida',
  extra: 'Extra',
}

function calcRecipeCost(
  recipeId: string,
  allIngredients: Map<string, RecipeIngredientWithIngredient[]>,
  allSubRecipes: Map<string, (RecipeSubRecipe & { recipes: Recipe & { servings: number } })[]>,
  servingsMap: Map<string, number>,
  visited = new Set<string>()
): number {
  if (visited.has(recipeId)) return 0
  visited.add(recipeId)

  const ings = allIngredients.get(recipeId) ?? []
  const subs = allSubRecipes.get(recipeId) ?? []

  const ingCost = ings.reduce((sum, ri) => {
    const effective = ri.ingredients.cost_per_unit / (1 - ri.ingredients.waste_percentage / 100)
    return sum + ri.quantity * effective
  }, 0)

  const subCost = subs.reduce((sum, sr) => {
    const childServings = servingsMap.get(sr.child_recipe_id) ?? 1
    const childTotalCost = calcRecipeCost(sr.child_recipe_id, allIngredients, allSubRecipes, servingsMap, new Set(visited))
    const costPerServing = childServings > 0 ? childTotalCost / childServings : 0
    return sum + sr.quantity * costPerServing
  }, 0)

  return ingCost + subCost
}

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recipesRes, ingredientsRes, subRecipesRes] = await Promise.all([
    supabase.from('recipes').select('*').order('name'),
    supabase.from('recipe_ingredients').select('*, ingredients(*)'),
    supabase.from('recipe_sub_recipes').select('*, recipes(*)'),
  ])

  const recipes = (recipesRes.data ?? []) as Recipe[]
  const recipeIngredients = (ingredientsRes.data ?? []) as unknown as RecipeIngredientWithIngredient[]
  const recipeSubRecipes = (subRecipesRes.data ?? []) as unknown as (RecipeSubRecipe & { recipes: Recipe })[]

  const ingByRecipe = new Map<string, RecipeIngredientWithIngredient[]>()
  for (const ri of recipeIngredients) {
    const arr = ingByRecipe.get(ri.recipe_id) ?? []
    arr.push(ri)
    ingByRecipe.set(ri.recipe_id, arr)
  }

  const subByRecipe = new Map<string, (RecipeSubRecipe & { recipes: Recipe & { servings: number } })[]>()
  for (const sr of recipeSubRecipes) {
    const arr = subByRecipe.get(sr.parent_recipe_id) ?? []
    arr.push(sr as RecipeSubRecipe & { recipes: Recipe & { servings: number } })
    subByRecipe.set(sr.parent_recipe_id, arr)
  }

  const servingsMap = new Map(recipes.map((r) => [r.id, r.servings]))

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
              Escandallos
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
              Desglosa el coste de cada receta por ingrediente.
            </p>
          </div>
          <Link
            href="/dashboard/recipes/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors duration-150 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Nueva receta
          </Link>
        </div>

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-20 bg-white border border-[#E5E7EB] rounded-xl">
            <span className="flex items-center justify-center h-12 w-12 rounded-full bg-[#F8FAFC]">
              <ClipboardList className="h-5 w-5 text-[#9CA3AF]" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Sin escandallos todavía</p>
              <p className="text-[13px] text-[#6B7280] mt-1 max-w-sm">Crea tu primera receta para calcular costes y márgenes.</p>
            </div>
            <Link
              href="/dashboard/recipes/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#115E59] transition-colors duration-150 active:scale-[0.97] mt-1"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Crear primera receta
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Nombre</th>
                    <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Categoría</th>
                    <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Raciones</th>
                    <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Coste total</th>
                    <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Coste/ración</th>
                    <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.map((recipe) => {
                    const totalCost = calcRecipeCost(recipe.id, ingByRecipe, subByRecipe, servingsMap)
                    const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0

                    return (
                      <tr
                        key={recipe.id}
                        className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8FAFC] transition-colors duration-150"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/dashboard/recipes/${recipe.id}`}
                            className="font-medium text-[#111827] hover:text-[#0F766E] transition-colors duration-150"
                          >
                            {recipe.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-[#6B7280]">
                          {recipe.category ? (
                            <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#6B7280]">
                              {CATEGORY_LABELS[recipe.category] ?? recipe.category}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[#6B7280] font-mono text-[13px] tabular-nums">{recipe.servings}</td>
                        <td className="px-5 py-3.5 font-mono text-[13px] text-[#111827] tabular-nums">
                          {totalCost.toFixed(2)} €
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[13px] font-semibold text-[#0F766E] tabular-nums">
                            {costPerServing.toFixed(4)} €
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/dashboard/recipes/${recipe.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F8FAFC] hover:border-[#D1D5DB] transition-colors duration-150 active:scale-[0.97]"
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
