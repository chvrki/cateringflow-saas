'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MovementSheet } from './_components/MovementSheet'
import type { StockIngredient, UpcomingBooking } from './page'

type SheetMode = 'movement' | 'adjust'

function statusOf(qty: number, min: number): 'green' | 'yellow' | 'red' {
  if (min === 0) return 'green'
  if (qty <= min) return 'red'
  if (qty <= min * 1.5) return 'yellow'
  return 'green'
}

function StockBadge({ qty, min }: { qty: number; min: number }) {
  const status = statusOf(qty, min)
  const map = {
    green:  { dot: 'bg-[#16A34A]', pill: 'bg-[#DCFCE7] text-[#16A34A]', label: 'OK' },
    yellow: { dot: 'bg-[#D97706]', pill: 'bg-[#FEF3C7] text-[#D97706]', label: 'Bajo' },
    red:    { dot: 'bg-[#DC2626]', pill: 'bg-[#FEE2E2] text-[#DC2626]', label: 'Alerta' },
  }
  const { dot, pill, label } = map[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', pill)}>
      <span className={cn('w-2 h-2 rounded-full inline-block flex-shrink-0', dot)} />
      {label}
    </span>
  )
}

interface StockClientProps {
  ingredients: StockIngredient[]
  alertsOnly: boolean
  bookings: UpcomingBooking[]
}

export function StockClient({ ingredients, alertsOnly, bookings }: StockClientProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<StockIngredient | null>(null)
  const [mode, setMode] = useState<SheetMode>('movement')

  function open(ing: StockIngredient, m: SheetMode) {
    setSelected(ing)
    setMode(m)
  }

  function close() {
    setSelected(null)
    router.refresh()
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() =>
            router.push(alertsOnly ? '/dashboard/stock' : '/dashboard/stock?filter=alerts')
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[15px] font-medium border transition-colors',
            alertsOnly
              ? 'bg-[#DC2626] border-[#DC2626] text-white hover:bg-[#B91C1C]'
              : 'bg-white border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC]'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {alertsOnly ? 'Ver todos' : 'Solo alertas'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Ingrediente</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Unidad</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">Stock actual</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">Mínimo</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Estado</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Ubicación</th>
              <th className="px-6 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[15px] text-[#9CA3AF]">
                  {alertsOnly
                    ? 'Sin ingredientes en alerta. El stock de todos los ingredientes es suficiente.'
                    : 'No hay ingredientes registrados. Añade ingredientes desde la sección Ingredientes.'}
                </td>
              </tr>
            ) : (
              ingredients.map((ing) => (
                <tr
                  key={ing.id}
                  className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors last:border-0"
                >
                  <td className="px-6 py-4 text-[15px] font-medium text-[#111827]">{ing.name}</td>
                  <td className="px-6 py-4 text-[15px] text-[#6B7280]">{ing.unit}</td>
                  <td className="px-6 py-4 text-[15px] font-mono text-right text-[#111827] tabular-nums">
                    {Number(ing.stock_quantity).toLocaleString('es-ES', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="px-6 py-4 text-[15px] font-mono text-right text-[#6B7280] tabular-nums">
                    {Number(ing.stock_min).toLocaleString('es-ES', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <StockBadge
                      qty={Number(ing.stock_quantity)}
                      min={Number(ing.stock_min)}
                    />
                  </td>
                  <td className="px-6 py-4 text-[15px] text-[#6B7280]">
                    {ing.stock_location ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => open(ing, 'movement')}
                        className="inline-flex items-center rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#111827] hover:bg-[#F8FAFC] transition-colors"
                      >
                        Movimiento
                      </button>
                      <button
                        onClick={() => open(ing, 'adjust')}
                        className="inline-flex items-center rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F8FAFC] transition-colors"
                      >
                        Ajuste
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MovementSheet ingredient={selected} defaultMode={mode} onClose={close} bookings={bookings} />
    </>
  )
}
