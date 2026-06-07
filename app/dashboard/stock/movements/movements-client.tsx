'use client'

import { useRouter } from 'next/navigation'
import { X, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MovementRow, IngredientOption } from './page'

const TYPE_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  entrada: { label: 'Entrada', cls: 'bg-[#DCFCE7] text-[#16A34A]', dot: 'bg-[#16A34A]' },
  salida:  { label: 'Salida',  cls: 'bg-[#FEE2E2] text-[#DC2626]', dot: 'bg-[#DC2626]' },
  ajuste:  { label: 'Ajuste',  cls: 'bg-[#F3F4F6] text-[#6B7280]', dot: 'bg-[#9CA3AF]' },
}

const REASON_LABELS: Record<string, string> = {
  compra:              'Compra',
  devolucion:          'Devolución',
  consumo_evento:      'Consumo evento',
  merma:               'Merma',
  ajuste_inventario:   'Ajuste inventario',
  otro:                'Otro',
}

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_BADGE[type] ?? { label: type, cls: 'bg-[#F3F4F6] text-[#6B7280]', dot: 'bg-[#9CA3AF]' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.cls)}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  )
}

function QtyCell({ type, quantity }: { type: string; quantity: number }) {
  const abs = Math.abs(quantity).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  if (type === 'entrada') return <span className="font-mono text-[#16A34A] font-medium tabular-nums">+{abs}</span>
  if (type === 'salida')  return <span className="font-mono text-[#DC2626] font-medium tabular-nums">−{abs}</span>
  return <span className="font-mono text-[#6B7280] font-medium tabular-nums">{abs}</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface ActiveFilters {
  ingredientId: string
  typeFilter: string
  fromDate: string
  toDate: string
}

interface MovementsClientProps {
  movements:      MovementRow[]
  allIngredients: IngredientOption[]
  activeFilters:  ActiveFilters
}

export function MovementsClient({
  movements,
  allIngredients,
  activeFilters,
}: MovementsClientProps) {
  const router = useRouter()
  const { ingredientId, typeFilter, fromDate, toDate } = activeFilters

  const hasFilters = !!(ingredientId || typeFilter || fromDate || toDate)

  function buildUrl(overrides: Partial<ActiveFilters> & { page?: string }) {
    const merged = {
      ingredient: overrides.ingredientId  ?? ingredientId,
      type:       overrides.typeFilter    ?? typeFilter,
      from:       overrides.fromDate      ?? fromDate,
      to:         overrides.toDate        ?? toDate,
    }
    const params = new URLSearchParams()
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    const path = '/dashboard/stock/movements'
    return params.size ? `${path}?${params}` : path
  }

  function applyFilter(overrides: Partial<ActiveFilters>) {
    router.push(buildUrl(overrides))
  }

  function clearFilters() {
    router.push('/dashboard/stock/movements')
  }

  const inputBase =
    'h-9 rounded-lg border border-[#E5E7EB] bg-white text-[15px] text-[#111827] px-3 ' +
    'focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 ' +
    'placeholder:text-[#9CA3AF]'

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={ingredientId || 'all'}
          onValueChange={(v) => applyFilter({ ingredientId: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="h-9 w-48 rounded-lg border-[#E5E7EB] bg-white text-[15px] text-[#111827] focus:border-[#0F766E] focus:ring-[#0F766E]/20">
            <SelectValue placeholder="Ingrediente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los ingredientes</SelectItem>
            {allIngredients.map((ing) => (
              <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter || 'all'}
          onValueChange={(v) => applyFilter({ typeFilter: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="h-9 w-36 rounded-lg border-[#E5E7EB] bg-white text-[15px] text-[#111827] focus:border-[#0F766E] focus:ring-[#0F766E]/20">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="salida">Salida</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => applyFilter({ fromDate: e.target.value })}
            className={inputBase}
            title="Desde"
          />
          <span className="text-[#9CA3AF] text-sm">—</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => applyFilter({ toDate: e.target.value })}
            className={inputBase}
            title="Hasta"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[14px] font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC] transition-colors duration-150 active:scale-[0.97]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Fecha</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Ingrediente</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Tipo</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">Cantidad</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Motivo</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Evento</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center mb-2">
                      <Inbox className="h-5 w-5 text-[#9CA3AF]" strokeWidth={1.5} />
                    </div>
                    <p className="text-[15px] font-medium text-[#111827]">
                      {hasFilters ? 'Sin resultados' : 'Aún no hay movimientos'}
                    </p>
                    <p className="text-[14px] text-[#6B7280]">
                      {hasFilters
                        ? 'No hay movimientos con los filtros aplicados.'
                        : 'Los movimientos de stock aparecerán aquí.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors duration-150 last:border-0"
                >
                  <td className="px-6 py-4 text-xs text-[#9CA3AF] whitespace-nowrap tabular-nums">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[15px] font-medium text-[#111827]">
                      {m.ingredients?.name ?? '—'}
                    </span>
                    {m.ingredients?.unit && (
                      <span className="ml-1.5 text-xs text-[#9CA3AF]">({m.ingredients.unit})</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <TypeBadge type={m.type} />
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    <QtyCell type={m.type} quantity={m.quantity} />
                  </td>
                  <td className="px-6 py-4 text-[15px] text-[#6B7280]">
                    {m.reason ? (REASON_LABELS[m.reason] ?? m.reason) : '—'}
                  </td>
                  <td className="px-6 py-4 text-[15px] text-[#6B7280]">
                    {m.bookings ? (
                      <span>
                        {m.bookings.client_name}
                        {m.bookings.event_date && (
                          <span className="ml-1 text-xs text-[#9CA3AF] tabular-nums">
                            {new Date(m.bookings.event_date).toLocaleDateString('es-ES', {
                              day: '2-digit', month: 'short',
                            })}
                          </span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-[15px] text-[#9CA3AF] max-w-[200px] truncate" title={m.notes ?? ''}>
                    {m.notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
