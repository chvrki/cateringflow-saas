'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ChevronDown, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Recipe, MenuRecipe, Ingredient, RecipeIngredient } from '@/types/database'

type RecipeIngredientWithIngredient = RecipeIngredient & { ingredients: Ingredient }
type MenuRecipeWithRecipe = MenuRecipe & {
  recipes: Recipe & {
    recipe_ingredients: RecipeIngredientWithIngredient[]
  }
}

interface MenuCostProps {
  menuId: string
  pricePerPerson: number
}

function calcRecipeCost(
  recipe: Recipe & { recipe_ingredients: RecipeIngredientWithIngredient[] }
): number {
  return (recipe.recipe_ingredients ?? []).reduce((sum, ri) => {
    const ing = ri.ingredients
    if (!ing) return sum
    const effective = ing.cost_per_unit / (1 - ing.waste_percentage / 100)
    return sum + ri.quantity * effective
  }, 0)
}

export function MenuCost({ menuId, pricePerPerson }: MenuCostProps) {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [menuRecipes, setMenuRecipes] = useState<MenuRecipeWithRecipe[]>([])
  const [allRecipes, setAllRecipes] = useState<Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [mrRes, recRes] = await Promise.all([
      supabase
        .from('menu_recipes')
        .select('*, recipes(*, recipe_ingredients(*, ingredients(*)))')
        .eq('menu_id', menuId),
      supabase.from('recipes').select('id, name, servings, category').order('name'),
    ])
    setMenuRecipes((mrRes.data ?? []) as unknown as MenuRecipeWithRecipe[])
    setAllRecipes((recRes.data ?? []) as Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>[])
    setLoading(false)
  }, [menuId])

  useEffect(() => { void loadData() }, [loadData])

  const menuCostPerPerson = useMemo(() => {
    return menuRecipes.reduce((sum, mr) => {
      const recipe = mr.recipes
      if (!recipe) return sum
      const totalCost = calcRecipeCost(recipe)
      const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0
      return sum + costPerServing * mr.portions_per_person
    }, 0)
  }, [menuRecipes])

  const margin = pricePerPerson > 0
    ? ((pricePerPerson - menuCostPerPerson) / pricePerPerson) * 100
    : 0

  const addRecipe = async (recipe: Pick<Recipe, 'id' | 'name'>) => {
    setSearch('')
    startTransition(async () => {
      const { error } = await supabase
        .from('menu_recipes')
        .insert({ menu_id: menuId, recipe_id: recipe.id, portions_per_person: 1 })
      if (error) {
        toast.error('No se pudo añadir la receta', { description: error.message })
        return
      }
      toast.success(`"${recipe.name}" añadida al menú`)
      await loadData()
    })
  }

  const updatePortions = async (mrId: string, portions: number) => {
    const { error } = await supabase
      .from('menu_recipes')
      .update({ portions_per_person: portions })
      .eq('id', mrId)
    if (error) toast.error('No se pudo actualizar', { description: error.message })
    else await loadData()
  }

  const removeRecipe = async (mrId: string, recipeName: string) => {
    if (!confirm(`¿Quitar "${recipeName}" del menú?`)) return
    startTransition(async () => {
      const { error } = await supabase.from('menu_recipes').delete().eq('id', mrId)
      if (error) {
        toast.error('No se pudo eliminar', { description: error.message })
        return
      }
      toast.success('Receta quitada del menú')
      await loadData()
    })
  }

  const assignedIds = new Set(menuRecipes.map((mr) => mr.recipe_id))
  const filteredRecipes = allRecipes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) &&
      !assignedIds.has(r.id)
  )

  if (loading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#0F766E]" />
      </div>
    )
  }

  const marginGood = margin >= 60
  const marginOk = margin >= 30 && margin < 60
  const marginBoxClass = marginGood
    ? 'bg-[#DCFCE7] border-[#16A34A]/20'
    : marginOk
    ? 'bg-[#FEF3C7] border-[#D97706]/20'
    : 'bg-[#FEE2E2] border-[#DC2626]/20'
  const marginIconClass = marginGood
    ? 'text-[#16A34A]'
    : marginOk
    ? 'text-[#D97706]'
    : 'text-[#DC2626]'
  const marginValueClass = marginGood
    ? 'text-[#16A34A]'
    : marginOk
    ? 'text-[#D97706]'
    : 'text-[#DC2626]'

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] font-heading">
        Análisis de coste
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Coste / pax</p>
          <p className="font-mono text-[17px] font-semibold text-[#111827] mt-0.5 tabular-nums">
            {menuCostPerPerson.toFixed(4)} €
          </p>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">P.V.P.</p>
          <p className="font-mono text-[17px] font-semibold text-[#0F766E] mt-0.5 tabular-nums">
            {pricePerPerson.toFixed(2)} €
          </p>
        </div>
        <div className={`col-span-2 rounded-lg p-3 border ${marginBoxClass}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${marginIconClass}`} />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">Margen</p>
          </div>
          <p className={`font-mono text-[20px] font-semibold mt-0.5 tabular-nums ${marginValueClass}`}>
            {margin.toFixed(1)}%
          </p>
          <p className="text-[13px] text-[#6B7280] mt-1">
            {margin < 30
              ? 'Margen bajo — revisa precios o costes'
              : margin < 60
              ? 'Margen aceptable'
              : 'Margen saludable'}
          </p>
        </div>
      </div>

      {/* Assigned recipes */}
      {menuRecipes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
            Recetas asignadas
          </p>
          {menuRecipes.map((mr) => {
            const recipe = mr.recipes
            if (!recipe) return null
            const totalCost = calcRecipeCost(recipe)
            const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0
            const contribution = costPerServing * mr.portions_per_person

            return (
              <div key={mr.id} className="border border-[#E5E7EB] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-[#111827] truncate">{recipe.name}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipe(mr.id, recipe.name)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg p-1 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[13px] text-[#6B7280]">
                  <span>Raciones usadas:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    defaultValue={mr.portions_per_person}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v > 0 && v !== mr.portions_per_person) {
                        updatePortions(mr.id, v)
                      }
                    }}
                    className="w-16 border border-[#E5E7EB] rounded-lg px-2 py-1 text-[13px] font-mono text-right text-[#111827] tabular-nums focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                  <span className="ml-auto font-mono text-[#0F766E] font-semibold tabular-nums">
                    {contribution.toFixed(4)} €/pax
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add recipe combobox */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-1.5">
          Añadir receta
        </p>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar receta…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 pr-8 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] bg-white focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
          {search && filteredRecipes.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredRecipes.slice(0, 8).map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => addRecipe(rec)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[15px] text-[#111827] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <span>{rec.name}</span>
                  <span className="text-[13px] text-[#9CA3AF] ml-2">{rec.servings} rac.</span>
                </button>
              ))}
            </div>
          )}
          {search && filteredRecipes.length === 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg px-3 py-2 text-[15px] text-[#9CA3AF]">
              No hay recetas disponibles.
            </div>
          )}
        </div>
        {allRecipes.length === 0 && (
          <p className="text-[13px] text-[#9CA3AF] mt-2">
            Crea recetas en{' '}
            <a href="/dashboard/recipes" className="text-[#0F766E] hover:text-[#115E59] hover:underline">
              Escandallos
            </a>{' '}
            para asignarlas aquí.
          </p>
        )}
      </div>
    </div>
  )
}
