'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createOrder } from '../actions'
import type { IngredientOption, SupplierOption } from './page'

type LineItem = {
  _key: string
  ingredientId: string
  quantityOrdered: string
  unit: string
  unitPrice: string
  notes: string
}

const labelCls = 'block text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] h-10 placeholder:text-[#9CA3AF]'

interface Props {
  suppliers: SupplierOption[]
  allIngredients: IngredientOption[]
  alertIngredients: IngredientOption[]
}

export function NewOrderClient({ suppliers, allIngredients, alertIngredients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [supplierId, setSupplierId] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])

  const ingMap = new Map(allIngredients.map((i) => [i.id, i]))
  const alertIds = new Set(alertIngredients.map((i) => i.id))

  function addAlertsLines() {
    const existingIds = new Set(lines.map((l) => l.ingredientId))
    const toAdd = alertIngredients.filter((i) => !existingIds.has(i.id))
    if (toAdd.length === 0) {
      toast.info('Todos los ingredientes con alerta ya están en el pedido')
      return
    }
    setLines((prev) => [
      ...prev,
      ...toAdd.map((i) => ({
        _key: crypto.randomUUID(),
        ingredientId: i.id,
        quantityOrdered: String(Math.max(1, Math.ceil(i.stock_min - i.stock_quantity))),
        unit: i.unit,
        unitPrice: '',
        notes: '',
      })),
    ])
  }

  function addEmptyLine() {
    setLines((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), ingredientId: '', quantityOrdered: '', unit: '', unitPrice: '', notes: '' },
    ])
  }

  function removeLine(_key: string) {
    setLines((prev) => prev.filter((l) => l._key !== _key))
  }

  function updateLine(_key: string, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l._key === _key ? { ...l, ...patch } : l)))
  }

  function onIngredientChange(_key: string, ingredientId: string) {
    const ing = ingMap.get(ingredientId)
    updateLine(_key, { ingredientId, unit: ing?.unit ?? '' })
  }

  function handleSubmit() {
    if (!supplierId) {
      toast.error('Selecciona un proveedor')
      return
    }
    if (lines.length === 0) {
      toast.error('Añade al menos un artículo')
      return
    }
    const invalid = lines.find(
      (l) => !l.ingredientId || !l.quantityOrdered || Number(l.quantityOrdered) <= 0,
    )
    if (invalid) {
      toast.error('Revisa las líneas: ingrediente y cantidad son obligatorios')
      return
    }

    startTransition(async () => {
      const res = await createOrder({
        supplierId,
        notes: orderNotes || undefined,
        items: lines.map((l) => ({
          ingredientId: l.ingredientId,
          quantityOrdered: Number(l.quantityOrdered),
          unit: l.unit,
          unitPrice: l.unitPrice ? Number(l.unitPrice) : null,
          notes: l.notes || null,
        })),
      })

      if ('error' in res) {
        toast.error('No se pudo crear el pedido', { description: res.error })
        return
      }
      toast.success('Pedido creado como borrador')
      router.push(`/dashboard/orders/${res.id}`)
    })
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors duration-150"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Volver a pedidos
      </Link>

      {/* Proveedor + notas */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-semibold text-[#111827] text-[17px]">Proveedor</h2>

        <div>
          <label className={labelCls}>Proveedor *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={cn(inputCls, 'w-full px-3 cursor-pointer')}
          >
            <option value="">Selecciona un proveedor…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {suppliers.length === 0 && (
            <p className="text-[13px] text-[#DC2626] mt-1.5">
              No tienes proveedores.{' '}
              <Link href="/dashboard/suppliers" className="underline">
                Añade uno primero.
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>Notas del pedido</label>
          <Textarea
            rows={2}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Observaciones, instrucciones de entrega…"
            className={cn(
              'resize-none bg-white border-[#E5E7EB] text-[#111827] rounded-lg text-[15px] placeholder:text-[#9CA3AF]',
              'focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20',
            )}
          />
        </div>
      </div>

      {/* Artículos */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-heading font-semibold text-[#111827] text-[17px]">Artículos</h2>
          {alertIngredients.length > 0 && (
            <button
              type="button"
              onClick={addAlertsLines}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20 hover:bg-[#FDE7B0] transition-colors duration-150 active:scale-[0.97]"
            >
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
              Añadir alertas de stock
              <span className="bg-[#D97706] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-semibold">
                {alertIngredients.length}
              </span>
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[14px] text-[#6B7280]">
              Sin artículos todavía. Añade uno manualmente o desde las alertas de stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3">
                    Ingrediente
                  </th>
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3 w-28">
                    Cantidad
                  </th>
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3 w-20">
                    Unidad
                  </th>
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3 w-28">
                    Precio unit. €
                  </th>
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3">
                    Notas
                  </th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {lines.map((line) => (
                  <tr key={line._key}>
                    <td className="py-2 pr-3">
                      <select
                        value={line.ingredientId}
                        onChange={(e) => onIngredientChange(line._key, e.target.value)}
                        className={cn(inputCls, 'w-full px-2 cursor-pointer')}
                      >
                        <option value="">Seleccionar…</option>
                        {allIngredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {alertIds.has(i.id) ? `⚠ ${i.name}` : i.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.quantityOrdered}
                        onChange={(e) => updateLine(line._key, { quantityOrdered: e.target.value })}
                        className={cn(inputCls, 'px-2')}
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(line._key, { unit: e.target.value })}
                        className={cn(inputCls, 'px-2')}
                        placeholder="kg"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line._key, { unitPrice: e.target.value })}
                        className={cn(inputCls, 'px-2')}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={line.notes}
                        onChange={(e) => updateLine(line._key, { notes: e.target.value })}
                        className={cn(inputCls, 'px-2')}
                        placeholder="Opcional"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(line._key)}
                        className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors duration-150 active:scale-[0.97]"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={addEmptyLine}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#0F766E] hover:text-[#115E59] font-medium transition-colors duration-150"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Añadir línea
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[15px] font-medium text-[#111827] hover:bg-[#F8FAFC] hover:border-[#D1D5DB] transition-colors duration-150 active:scale-[0.97]"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Guardar borrador
        </button>
      </div>
    </div>
  )
}
