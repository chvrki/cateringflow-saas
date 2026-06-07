'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRecipe, updateRecipe, deleteRecipe } from '../actions'
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
  RecipeSubRecipe,
} from '@/types/database'

type RecipeIngredientWithIngredient = RecipeIngredient & { ingredients: Ingredient }
type RecipeSubRecipeWithChild = RecipeSubRecipe & {
  recipes: Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>
}

const CATEGORIES = [
  { value: 'entrante', label: 'Entrante' },
  { value: 'primer', label: 'Primer plato' },
  { value: 'segundo', label: 'Segundo plato' },
  { value: 'postre', label: 'Postre' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'extra', label: 'Extra' },
]

const UNITS = ['kg', 'l', 'g', 'ml', 'unit']

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] h-10 placeholder:text-[#9CA3AF]'

type IngredientRow = {
  _key: string
  ingredient_id: string
  quantity: number
  unit: string
}

type SubRecipeRow = {
  _key: string
  child_recipe_id: string
  quantity: number
}

interface RecipeEditorProps {
  mode: 'new' | 'edit'
  recipe?: Recipe
  ingredients: Ingredient[]
  availableRecipes: Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>[]
  initialIngredients?: RecipeIngredientWithIngredient[]
  initialSubRecipes?: RecipeSubRecipeWithChild[]
}

let _keyCounter = 0
function nextKey() {
  return String(++_keyCounter)
}

export function RecipeEditor({
  mode,
  recipe,
  ingredients,
  availableRecipes,
  initialIngredients = [],
  initialSubRecipes = [],
}: RecipeEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  const [name, setName] = useState(recipe?.name ?? '')
  const [category, setCategory] = useState(recipe?.category ?? 'none')
  const [servings, setServings] = useState(recipe?.servings ?? 1)
  const [notes, setNotes] = useState(recipe?.notes ?? '')
  const [markup, setMarkup] = useState(3)

  const [ingRows, setIngRows] = useState<IngredientRow[]>(() =>
    initialIngredients.map((ri) => ({
      _key: nextKey(),
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit,
    }))
  )

  const [subRows, setSubRows] = useState<SubRecipeRow[]>(() =>
    initialSubRecipes.map((sr) => ({
      _key: nextKey(),
      child_recipe_id: sr.child_recipe_id,
      quantity: sr.quantity,
    }))
  )

  const [ingSearch, setIngSearch] = useState('')
  const [subSearch, setSubSearch] = useState('')

  const ingMap = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients]
  )

  const recipeMap = useMemo(
    () => new Map(availableRecipes.map((r) => [r.id, r])),
    [availableRecipes]
  )

  const ingRowsCost = useMemo(() => {
    return ingRows.map((row) => {
      const ing = ingMap.get(row.ingredient_id)
      if (!ing) return 0
      const effective = ing.cost_per_unit / (1 - ing.waste_percentage / 100)
      return row.quantity * effective
    })
  }, [ingRows, ingMap])

  const subRowsCost = useMemo(() => {
    return subRows.map((_row) => 0)
  }, [subRows])

  const totalCost = ingRowsCost.reduce((a, b) => a + b, 0) + subRowsCost.reduce((a, b) => a + b, 0)
  const costPerServing = servings > 0 ? totalCost / servings : 0
  const suggestedPrice = costPerServing * markup
  const margin = suggestedPrice > 0 ? ((suggestedPrice - costPerServing) / suggestedPrice) * 100 : 0

  const addIngredientRow = (ing: Ingredient) => {
    setIngRows((prev) => [
      ...prev,
      { _key: nextKey(), ingredient_id: ing.id, quantity: 1, unit: ing.unit },
    ])
    setIngSearch('')
  }

  const addSubRecipeRow = (rec: Pick<Recipe, 'id' | 'name' | 'servings' | 'category'>) => {
    setSubRows((prev) => [
      ...prev,
      { _key: nextKey(), child_recipe_id: rec.id, quantity: 1 },
    ])
    setSubSearch('')
  }

  const updateIngRow = useCallback(
    (key: string, field: keyof Omit<IngredientRow, '_key'>, value: string | number) => {
      setIngRows((prev) =>
        prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
      )
    },
    []
  )

  const updateSubRow = useCallback(
    (key: string, field: keyof Omit<SubRecipeRow, '_key'>, value: string | number) => {
      setSubRows((prev) =>
        prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
      )
    },
    []
  )

  const filteredIngredients = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(ingSearch.toLowerCase()) &&
      !ingRows.some((r) => r.ingredient_id === i.id)
  )

  const filteredRecipes = availableRecipes.filter(
    (r) =>
      r.name.toLowerCase().includes(subSearch.toLowerCase()) &&
      !subRows.some((s) => s.child_recipe_id === r.id)
  )

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('El nombre de la receta es obligatorio')
      return
    }
    if (servings < 1) {
      toast.error('Las raciones deben ser al menos 1')
      return
    }

    const payload = {
      name: name.trim(),
      category: category === 'none' ? null : category,
      servings,
      notes: notes.trim() || null,
      ingredients: ingRows.map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: r.quantity,
        unit: r.unit,
      })),
      sub_recipes: subRows.map((r) => ({
        child_recipe_id: r.child_recipe_id,
        quantity: r.quantity,
      })),
    }

    startTransition(async () => {
      const res =
        mode === 'edit' && recipe
          ? await updateRecipe(recipe.id, payload)
          : await createRecipe(payload)

      if (res.error) {
        toast.error('No se pudo guardar la receta', { description: res.error })
        return
      }

      toast.success(mode === 'edit' ? 'Receta actualizada' : 'Receta creada')
      if (mode === 'new' && 'id' in res && res.id) {
        router.push(`/dashboard/recipes/${res.id}`)
      } else {
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!recipe) return
    if (!confirm(`¿Eliminar "${recipe.name}"? Esta acción no se puede deshacer.`)) return
    setIsDeleting(true)
    startTransition(async () => {
      await deleteRecipe(recipe.id)
    })
  }

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        {/* Back */}
        <Link
          href="/dashboard/recipes"
          className="group inline-flex items-center gap-1.5 text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" strokeWidth={1.5} />
          Escandallos
        </Link>

        {/* Header row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <nav className="text-[13px] text-[#6B7280] flex items-center gap-1 mb-1">
              <Link href="/dashboard/recipes" className="text-[#0F766E] hover:text-[#115E59] font-medium">
                Escandallos
              </Link>
              <span className="text-[#9CA3AF]">›</span>
              <span className="truncate max-w-[240px] text-[#111827]">
                {name || (mode === 'new' ? 'Nueva receta' : 'Receta')}
              </span>
            </nav>
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
              {mode === 'new' ? 'Nueva receta' : (name || 'Editar receta')}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {mode === 'edit' && recipe && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending || isDeleting}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DC2626]/20 bg-white px-4 py-2 text-[14px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50 transition-colors duration-150 active:scale-[0.97] disabled:active:scale-100"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                Eliminar
              </button>
            )}
            <Link
              href="/dashboard/recipes"
              className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[14px] font-medium text-[#111827] hover:bg-[#F8FAFC] hover:border-[#D1D5DB] transition-colors duration-150 active:scale-[0.97]"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#115E59] disabled:opacity-50 transition-colors duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.5} />Guardando…</>
              ) : (
                mode === 'new' ? 'Crear receta' : 'Guardar cambios'
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left column: form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header info */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                Información general
              </h2>

              <div>
                <label className={labelCls}>Nombre de la receta</label>
                <Input
                  className={cn(inputCls, 'mt-1')}
                  placeholder="Ej. Croquetas de jamón ibérico"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Categoría</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className={cn(inputCls, 'w-full mt-1')}>
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Raciones</label>
                  <Input
                    className={cn(inputCls, 'mt-1')}
                    type="number"
                    min="1"
                    step="1"
                    value={servings}
                    onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Notas</label>
                <Textarea
                  className="mt-1 bg-white border border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] min-h-[4rem] placeholder:text-[#9CA3AF]"
                  placeholder="Instrucciones, temperatura de cocción, tiempo…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Ingredients section */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                Ingredientes
              </h2>

              {ingRows.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-1">
                    <span>Ingrediente</span>
                    <span>Cantidad</span>
                    <span>Unidad</span>
                    <span className="text-right">Coste</span>
                    <span></span>
                  </div>
                  {ingRows.map((row, i) => {
                    const ing = ingMap.get(row.ingredient_id)
                    const rowCost = ingRowsCost[i]
                    return (
                      <div
                        key={row._key}
                        className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-center"
                      >
                        <div className="text-[15px] font-medium text-[#111827] truncate">
                          {ing?.name ?? '—'}
                        </div>
                        <Input
                          className="h-9 text-[15px] text-right font-mono tabular-nums border-[#E5E7EB] focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20"
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={row.quantity}
                          onChange={(e) =>
                            updateIngRow(row._key, 'quantity', parseFloat(e.target.value) || 0)
                          }
                        />
                        <Select
                          value={row.unit}
                          onValueChange={(v) => updateIngRow(row._key, 'unit', v)}
                        >
                          <SelectTrigger className="h-9 text-[15px] border-[#E5E7EB] focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-right text-[15px] font-mono text-[#0F766E] tabular-nums">
                          {rowCost.toFixed(3)}€
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setIngRows((prev) => prev.filter((r) => r._key !== row._key))
                          }
                          className="flex items-center justify-center rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors duration-150 active:scale-[0.94]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add ingredient combobox */}
              <div className="relative">
                <Input
                  className={cn(inputCls, 'pr-8')}
                  placeholder="Buscar y añadir ingrediente…"
                  value={ingSearch}
                  onChange={(e) => setIngSearch(e.target.value)}
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" strokeWidth={1.5} />
                {ingSearch && filteredIngredients.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-[0_8px_24px_rgba(15,23,42,0.08)] max-h-48 overflow-y-auto">
                    {filteredIngredients.slice(0, 15).map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => addIngredientRow(ing)}
                        className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F8FAFC] transition-colors duration-150 text-left"
                      >
                        <span>{ing.name}</span>
                        <span className="text-xs text-[#9CA3AF] font-mono tabular-nums ml-2">
                          {Number(ing.cost_per_unit).toFixed(4)} €/{ing.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {ingSearch && filteredIngredients.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-4 py-3 text-[14px] text-[#9CA3AF]">
                    No hay ingredientes coincidentes.{' '}
                    <Link href="/dashboard/ingredients" className="group inline-flex items-center gap-1 text-[#0F766E] hover:text-[#115E59] transition-colors duration-150">
                      Añadir ingrediente
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-recipes section */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                Sub-recetas
              </h2>
              <p className="text-[13px] text-[#9CA3AF]">
                Añade otras recetas como componente (ej. una salsa base).
              </p>

              {subRows.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_100px_32px] gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-1">
                    <span>Receta</span>
                    <span>Raciones</span>
                    <span></span>
                  </div>
                  {subRows.map((row) => {
                    const child = recipeMap.get(row.child_recipe_id)
                    return (
                      <div
                        key={row._key}
                        className="grid grid-cols-[1fr_100px_32px] gap-2 items-center"
                      >
                        <div className="text-[15px] font-medium text-[#111827] truncate">
                          {child?.name ?? '—'}
                        </div>
                        <Input
                          className="h-9 text-[15px] text-right font-mono tabular-nums border-[#E5E7EB] focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20"
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={row.quantity}
                          onChange={(e) =>
                            updateSubRow(row._key, 'quantity', parseFloat(e.target.value) || 1)
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSubRows((prev) => prev.filter((r) => r._key !== row._key))
                          }
                          className="flex items-center justify-center rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors duration-150 active:scale-[0.94]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="relative">
                <Input
                  className={cn(inputCls, 'pr-8')}
                  placeholder="Buscar y añadir sub-receta…"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" strokeWidth={1.5} />
                {subSearch && filteredRecipes.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-[0_8px_24px_rgba(15,23,42,0.08)] max-h-48 overflow-y-auto">
                    {filteredRecipes.slice(0, 10).map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => addSubRecipeRow(rec)}
                        className="w-full flex items-center justify-between px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F8FAFC] transition-colors duration-150 text-left"
                      >
                        <span>{rec.name}</span>
                        <span className="text-xs text-[#9CA3AF] ml-2">{rec.servings} rac.</span>
                      </button>
                    ))}
                  </div>
                )}
                {subSearch && filteredRecipes.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg px-4 py-3 text-[15px] text-[#9CA3AF]">
                    No hay recetas disponibles.
                  </div>
                )}
              </div>

              {availableRecipes.length === 0 && (
                <div className="flex items-center gap-2 text-[13px] text-[#6B7280] bg-[#FEF3C7] border border-[#D97706]/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" strokeWidth={1.5} />
                  Crea otras recetas primero para poder usarlas como sub-recetas.
                </div>
              )}
            </div>
          </div>

          {/* Right column: cost summary */}
          <div className="space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4 sticky top-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                Resumen de coste
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-[15px] text-[#6B7280]">Coste total receta</span>
                  <span className="font-mono font-semibold text-[#111827] tabular-nums">
                    {totalCost.toFixed(4)} €
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[15px] text-[#6B7280]">Coste por ración</span>
                  <span className="font-mono font-semibold text-[#0F766E] tabular-nums">
                    {costPerServing.toFixed(4)} €
                  </span>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
                <div>
                  <label className={labelCls}>Multiplicador de precio</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      className={cn(inputCls, 'w-20 text-right font-mono tabular-nums')}
                      type="number"
                      step="0.1"
                      min="1"
                      value={markup}
                      onChange={(e) => setMarkup(parseFloat(e.target.value) || 1)}
                    />
                    <span className="text-[13px] text-[#9CA3AF]">× coste/ración</span>
                  </div>
                </div>

                <div className="bg-[#CCFBF1] border border-[#0F766E]/20 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0F766E]">
                      P.V.P. sugerido
                    </span>
                    <span className="font-mono font-semibold text-[#0F766E] text-lg tabular-nums">
                      {suggestedPrice.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] text-[#0F766E]/80">Margen</span>
                    <span className="font-mono text-sm font-semibold text-[#0F766E]/80 tabular-nums">
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {ingRows.length === 0 && subRows.length === 0 && (
                <p className="text-[13px] text-[#9CA3AF] text-center pt-2">
                  Añade ingredientes para ver el cálculo de costes.
                </p>
              )}

              {subRows.length > 0 && (
                <p className="text-[13px] text-[#9CA3AF] bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-3 py-2">
                  El coste de sub-recetas se calcula en el listado, donde se tienen en cuenta sus ingredientes completos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
