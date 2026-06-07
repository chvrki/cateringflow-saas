'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ArrowUpDown, Loader2, ShoppingBasket } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createIngredient,
  updateIngredient,
  updateIngredientCost,
  deleteIngredient,
} from './actions'
import type { Ingredient } from '@/types/database'

const UNITS = ['kg', 'l', 'g', 'ml', 'unit'] as const

const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  unit: z.enum(UNITS, { required_error: 'Selecciona una unidad' }),
  cost_per_unit: z.number({ invalid_type_error: 'Coste obligatorio' }).min(0),
  waste_percentage: z.number().min(0).max(99.99).default(0),
  supplier: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

type IngredientFormValues = z.infer<typeof ingredientSchema>

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] h-10 placeholder:text-[#9CA3AF]'

function formatCostUnit(unit: string) {
  return unit === 'unit' ? 'ud' : unit
}

function InlineCostCell({ ingredient }: { ingredient: Ingredient }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(ingredient.cost_per_unit))
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const save = async () => {
    const parsed = parseFloat(value)
    if (isNaN(parsed) || parsed < 0) {
      setValue(String(ingredient.cost_per_unit))
      setEditing(false)
      return
    }
    if (parsed === ingredient.cost_per_unit) {
      setEditing(false)
      return
    }
    setBusy(true)
    const res = await updateIngredientCost(ingredient.id, parsed)
    setBusy(false)
    if (res.error) {
      toast.error('No se pudo actualizar el coste', { description: res.error })
      setValue(String(ingredient.cost_per_unit))
    } else {
      toast.success('Coste actualizado')
    }
    setEditing(false)
  }

  if (busy) return <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.0001"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setValue(String(ingredient.cost_per_unit)); setEditing(false) }
        }}
        className="w-24 border border-[#0F766E] rounded-lg px-2 py-1 text-sm text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
      />
    )
  }

  return (
    <button
      type="button"
      title="Haz clic para editar"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 font-mono text-sm tabular-nums text-[#111827] hover:text-[#0F766E] transition-colors"
    >
      {Number(ingredient.cost_per_unit).toFixed(4)} €/{formatCostUnit(ingredient.unit)}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}

interface IngredientsClientProps {
  ingredients: Ingredient[]
  totalCount: number
  suppliers: string[]
  currentSupplier: string
  currentSort: string
}

export function IngredientsClient({
  ingredients,
  totalCount,
  suppliers,
  currentSupplier,
  currentSort,
}: IngredientsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      unit: 'kg',
      cost_per_unit: 0,
      waste_percentage: 0,
      supplier: '',
      notes: '',
    },
  })

  const openCreate = () => {
    setEditTarget(null)
    form.reset({ name: '', unit: 'kg', cost_per_unit: 0, waste_percentage: 0, supplier: '', notes: '' })
    setSheetOpen(true)
  }

  const openEdit = (ing: Ingredient) => {
    setEditTarget(ing)
    form.reset({
      name: ing.name,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      waste_percentage: ing.waste_percentage,
      supplier: ing.supplier ?? '',
      notes: ing.notes ?? '',
    })
    setSheetOpen(true)
  }

  const onSubmit = (values: IngredientFormValues) => {
    startTransition(async () => {
      const payload = {
        name: values.name,
        unit: values.unit,
        cost_per_unit: values.cost_per_unit,
        waste_percentage: values.waste_percentage,
        supplier: values.supplier || null,
        notes: values.notes || null,
      }

      const res = editTarget
        ? await updateIngredient(editTarget.id, payload)
        : await createIngredient(payload)

      if (res.error) {
        toast.error(editTarget ? 'No se pudo actualizar' : 'No se pudo crear', {
          description: res.error,
        })
        return
      }

      toast.success(editTarget ? 'Ingrediente actualizado' : 'Ingrediente creado')
      setSheetOpen(false)
      router.refresh()
    })
  }

  const handleDelete = (ing: Ingredient) => {
    if (!confirm(`¿Eliminar "${ing.name}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(ing.id)
    startTransition(async () => {
      const res = await deleteIngredient(ing.id)
      setDeletingId(null)
      if (res.error) {
        toast.error('No se pudo eliminar', { description: res.error })
        return
      }
      toast.success('Ingrediente eliminado')
      router.refresh()
    })
  }

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/dashboard/ingredients?${params.toString()}`)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currentSupplier}
            onChange={(e) => setParam('supplier', e.target.value)}
            className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[15px] text-[#111827] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={currentSort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[15px] text-[#111827] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          >
            <option value="name">Nombre A→Z</option>
            <option value="cost_asc">Coste ↑</option>
            <option value="cost_desc">Coste ↓</option>
          </select>

          <span className="text-[13px] text-[#9CA3AF] hidden sm:block">
            {totalCount} ingrediente{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo ingrediente
        </button>
      </div>

      {/* Table */}
      {ingredients.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-16 text-center flex flex-col items-center justify-center">
          <ShoppingBasket className="w-12 h-12 text-[#9CA3AF] mb-4" />
          <h3 className="font-heading font-semibold text-[#111827] text-lg">Sin ingredientes todavía</h3>
          <p className="text-[15px] text-[#6B7280] mt-2 mb-6 max-w-sm mx-auto">
            Añade materias primas para calcular los costes de tus escandallos.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir primer ingrediente
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Nombre</th>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Unidad</th>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">
                    <span className="flex items-center gap-1">
                      Coste
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Merma</th>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Proveedor</th>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => (
                  <tr
                    key={ing.id}
                    className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-[#111827]">{ing.name}</td>
                    <td className="px-5 py-3.5 text-[#6B7280] font-mono text-xs">{ing.unit}</td>
                    <td className="px-5 py-3.5">
                      <InlineCostCell ingredient={ing} />
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">
                      {ing.waste_percentage > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-[#FEF3C7] border border-[#D97706]/20 px-2 py-0.5 text-xs font-medium text-[#D97706]">
                          {ing.waste_percentage}%
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{ing.supplier ?? <span className="text-[#9CA3AF]">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(ing)}
                          className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#0F766E] hover:bg-[#CCFBF1] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ing)}
                          disabled={deletingId === ing.id}
                          className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors disabled:opacity-40"
                          title="Eliminar"
                        >
                          {deletingId === ing.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setSheetOpen(false)}>
        <SheetContent
          side="right"
          className="w-full max-w-[min(100vw,480px)] sm:max-w-[480px] border-l border-[#E5E7EB] bg-white p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="p-6 border-b border-[#E5E7EB]">
            <SheetTitle className="font-heading text-[17px] font-semibold text-[#111827] text-left">
              {editTarget ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form id="ingredient-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Nombre</FormLabel>
                      <FormControl>
                        <Input className={inputCls} placeholder="Aceite de oliva virgen extra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Unidad</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={cn(inputCls, 'w-full')}>
                              <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_per_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Coste / unidad (€)</FormLabel>
                        <FormControl>
                          <Input
                            className={inputCls}
                            type="number"
                            step="0.0001"
                            min="0"
                            placeholder="0.00"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="waste_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Merma (%)</FormLabel>
                      <FormControl>
                        <Input
                          className={inputCls}
                          type="number"
                          step="0.01"
                          min="0"
                          max="99.99"
                          placeholder="0"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <p className="text-[13px] text-[#9CA3AF] mt-1">
                        Porcentaje de materia prima no aprovechable (pelado, huesos, etc.)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Proveedor</FormLabel>
                      <FormControl>
                        <Input className={inputCls} placeholder="Makro, Sysco…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          className="bg-white border border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] min-h-[5rem] placeholder:text-[#9CA3AF]"
                          placeholder="Observaciones opcionales…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <SheetFooter className="p-4 border-t border-[#E5E7EB] flex flex-row gap-3 sm:justify-start bg-[#F8FAFC]/80">
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[15px] font-medium text-[#111827] hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="ingredient-form"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] disabled:opacity-50"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando…</>
              ) : (
                editTarget ? 'Guardar cambios' : 'Crear ingrediente'
              )}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
