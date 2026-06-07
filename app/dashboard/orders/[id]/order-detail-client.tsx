'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Printer, Send, PackageCheck, XCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { updateOrderStatus, receiveOrder } from '../actions'
import type { OrderDetail } from './page'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  borrador:  { label: 'Borrador',  cls: 'bg-[#F3F4F6] text-[#6B7280]' },
  enviado:   { label: 'Enviado',   cls: 'bg-[#CCFBF1] text-[#0F766E]' },
  recibido:  { label: 'Recibido',  cls: 'bg-[#DCFCE7] text-[#16A34A]' },
  cancelado: { label: 'Cancelado', cls: 'bg-[#FEE2E2] text-[#DC2626]' },
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function OrderDetailClient({ order }: { order: OrderDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [received, setReceived] = useState<Record<string, string>>({})

  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.borrador
  const items = order.purchase_order_items
  const isRecibido = order.status === 'recibido'

  const hasPrices = items.some((i) => i.unit_price != null)
  const total = hasPrices
    ? items.reduce((sum, i) => sum + (i.unit_price ?? 0) * i.quantity_ordered, 0)
    : 0

  const tfootLabelSpan = isRecibido ? 5 : 4

  function openSheet() {
    const init: Record<string, string> = {}
    items.forEach((i) => {
      init[i.id] = String(i.quantity_received ?? i.quantity_ordered)
    })
    setReceived(init)
    setSheetOpen(true)
  }

  function handleMarkSent() {
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, 'enviado')
      if ('error' in res) {
        toast.error('No se pudo actualizar el estado', { description: res.error })
        return
      }
      toast.success('Pedido marcado como enviado')
      router.refresh()
    })
  }

  function handleCancel() {
    if (!confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, 'cancelado')
      if ('error' in res) {
        toast.error('No se pudo cancelar', { description: res.error })
        return
      }
      toast.success('Pedido cancelado')
      router.refresh()
    })
  }

  function handleReceive() {
    startTransition(async () => {
      const payload = items.map((i) => ({
        itemId: i.id,
        ingredientId: i.ingredient_id,
        quantityReceived: Math.max(0, Number(received[i.id] ?? 0)),
        unit: i.unit,
      }))

      const res = await receiveOrder(order.id, payload)
      if ('error' in res) {
        toast.error('No se pudo registrar la recepción', { description: res.error })
        return
      }
      toast.success('Recepción registrada y stock actualizado')
      setSheetOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      {/* Back + action buttons — hidden when printing */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4 print:hidden">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-[15px] text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a pedidos
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-[#111827] border border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>

          {order.status === 'borrador' && (
            <button
              onClick={handleMarkSent}
              disabled={isPending}
              className="inline-flex items-center rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] disabled:opacity-50 transition-colors"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Send className="h-4 w-4 mr-2" />}
              Marcar como enviado
            </button>
          )}

          {order.status === 'enviado' && (
            <>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center rounded-lg border border-[#DC2626]/20 px-4 py-2 text-[15px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar pedido
              </button>
              <button
                onClick={openSheet}
                disabled={isPending}
                className="inline-flex items-center rounded-lg bg-[#16A34A] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#15803D] disabled:opacity-50 transition-colors"
              >
                <PackageCheck className="h-4 w-4 mr-2" />
                Registrar recepción
              </button>
            </>
          )}
        </div>
      </div>

      <div id="print-area">
      {/* Header card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-6 print:border-0 print:shadow-none print:p-0 print:mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] print:text-xl">
              Pedido — {order.suppliers?.name ?? 'Sin proveedor'}
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-1">
              Creado el {fmtDate(order.created_at)}
              {order.sent_at && ` · Enviado el ${fmtDate(order.sent_at)}`}
              {order.received_at && ` · Recibido el ${fmtDate(order.received_at)}`}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>

        {order.notes && (
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1">Notas</p>
            <p className="text-[15px] text-[#6B7280]">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden print:border-0 print:shadow-none print:overflow-visible">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] print:bg-white">
            <tr>
              <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">
                Ingrediente
              </th>
              <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">
                Cant. pedida
              </th>
              {isRecibido && (
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">
                  Cant. recibida
                </th>
              )}
              <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">
                Unidad
              </th>
              {hasPrices && (
                <>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">
                    Precio unit.
                  </th>
                  <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">
                    Subtotal
                  </th>
                </>
              )}
              <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">
                Notas
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const subtotal = (item.unit_price ?? 0) * item.quantity_ordered
              const receivedShort =
                isRecibido &&
                item.quantity_received != null &&
                item.quantity_received < item.quantity_ordered
              return (
                <tr
                  key={item.id}
                  className="border-b border-[#E5E7EB] last:border-0"
                >
                  <td className="px-5 py-3.5 font-medium text-[#111827]">
                    {item.ingredients?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[#6B7280] text-right tabular-nums">
                    {item.quantity_ordered}
                  </td>
                  {isRecibido && (
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span
                        className={
                          receivedShort
                            ? 'text-[#D97706] font-medium'
                            : 'text-[#16A34A] font-medium'
                        }
                      >
                        {item.quantity_received ?? '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-[#6B7280]">{item.unit}</td>
                  {hasPrices && (
                    <>
                      <td className="px-5 py-3.5 text-[#6B7280] text-right tabular-nums">
                        {item.unit_price != null ? `${fmt(item.unit_price)} €` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[#111827] text-right tabular-nums font-medium">
                        {item.unit_price != null ? `${fmt(subtotal)} €` : '—'}
                      </td>
                    </>
                  )}
                  <td className="px-5 py-3.5 text-[#9CA3AF] text-sm">
                    {item.notes || <span className="text-[#E5E7EB]">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {hasPrices && (
            <tfoot className="bg-[#F8FAFC] border-t border-[#E5E7EB] print:bg-white">
              <tr>
                <td
                  colSpan={tfootLabelSpan}
                  className="px-5 py-3 text-sm font-semibold text-[#6B7280] text-right"
                >
                  Total estimado
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-bold text-[#111827]">
                  {fmt(total)} €
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      </div>{/* /print-area */}

      {/* Reception sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setSheetOpen(false)}>
        <SheetContent
          side="right"
          className="w-full max-w-[min(100vw,520px)] sm:max-w-[520px] border-l border-[#E5E7EB] bg-white p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="p-6 border-b border-[#E5E7EB]">
            <SheetTitle className="font-heading text-[17px] font-semibold text-[#111827] text-left">
              Registrar recepción
            </SheetTitle>
            <p className="text-[15px] text-[#6B7280] text-left mt-1">
              Ajusta las cantidades realmente recibidas. Se crearán entradas de stock automáticamente.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3">
                    Ingrediente
                  </th>
                  <th className="pb-2 text-right text-[12px] font-medium text-[#6B7280] uppercase tracking-wide pr-3 w-20">
                    Pedido
                  </th>
                  <th className="pb-2 text-left text-[12px] font-medium text-[#6B7280] uppercase tracking-wide w-28">
                    Recibido
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 font-medium text-[#111827]">
                      {item.ingredients?.name ?? '—'}
                      <span className="text-[#9CA3AF] font-normal ml-1 text-xs">{item.unit}</span>
                    </td>
                    <td className="py-3 pr-3 text-[#6B7280] tabular-nums text-right">
                      {item.quantity_ordered}
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={received[item.id] ?? ''}
                        onChange={(e) =>
                          setReceived((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="h-9 px-2 bg-white border-[#E5E7EB] rounded-lg text-[15px] focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SheetFooter className="p-6 border-t border-[#E5E7EB] gap-2 flex-row">
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[15px] font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleReceive}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#16A34A] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#15803D] disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar recepción
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
