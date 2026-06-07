'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Eye } from 'lucide-react'
import { Pagination } from '@/app/dashboard/_components/Pagination'
import type { OrderRow } from './page'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  borrador:  { label: 'Borrador',  cls: 'bg-[#F3F4F6] text-[#6B7280]' },
  enviado:   { label: 'Enviado',   cls: 'bg-[#CCFBF1] text-[#0F766E]' },
  recibido:  { label: 'Recibido',  cls: 'bg-[#DCFCE7] text-[#16A34A]' },
  cancelado: { label: 'Cancelado', cls: 'bg-[#FEE2E2] text-[#DC2626]' },
}

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'recibido', label: 'Recibido' },
  { value: 'cancelado', label: 'Cancelado' },
]

interface Props {
  orders: OrderRow[]
  totalPages: number
  currentPage: number
  statusFilter: string
}

export function OrdersClient({ orders, totalPages, currentPage, statusFilter }: Props) {
  const router = useRouter()

  function setStatus(value: string) {
    const params = new URLSearchParams()
    if (value) params.set('status', value)
    router.push(`/dashboard/orders?${params.toString()}`)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#0F766E] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#0F766E] hover:text-[#0F766E]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Link
          href="/dashboard/orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo pedido
        </Link>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-16 text-center flex flex-col items-center">
          <p className="text-[#9CA3AF] text-[15px] mb-4">
            No hay pedidos{statusFilter ? ' con este estado' : ''}.
          </p>
          <Link
            href="/dashboard/orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear primer pedido
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Proveedor</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Estado</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Líneas</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Fecha</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const badge = STATUS_BADGE[o.status] ?? STATUS_BADGE.borrador
                return (
                  <tr
                    key={o.id}
                    className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors last:border-0"
                  >
                    <td className="px-5 py-3.5 font-medium text-[#111827]">
                      {o.suppliers?.name ?? <span className="text-[#9CA3AF]">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">
                      {o.purchase_order_items.length}{' '}
                      artículo{o.purchase_order_items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280] tabular-nums">
                      {new Date(o.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/dashboard/orders/${o.id}`}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#111827] border border-[#E5E7EB] hover:border-[#0F766E] hover:text-[#0F766E] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/dashboard/orders"
            extraParams={statusFilter ? { status: statusFilter } : undefined}
          />
        </div>
      )}
    </>
  )
}
