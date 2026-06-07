'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CalendarDays, FileDown, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { BookingWithMenu } from '@/types/database'
import { updateBookingStatus } from '@/app/dashboard/calendar/actions'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const VAT_RATE = 0.21

function splitVat(total: number) {
  const subtotal = Math.round((total / (1 + VAT_RATE)) * 100) / 100
  const iva = Math.round((total - subtotal) * 100) / 100
  return { subtotal, iva }
}

const FILTERS = [
  { value: 'all',       label: 'Todos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'pending',   label: 'Pendientes' },
  { value: 'cancelled', label: 'Cancelados' },
]

const fieldLabel = 'text-[11px] uppercase tracking-widest text-[#6B7280] font-medium block mb-1'

export function ClientBookings({
  bookings,
  statusMap,
}: {
  bookings: BookingWithMenu[]
  statusMap: Record<string, { label: string; cls: string }>
}) {
  const router = useRouter()
  const [rows, setRows]           = useState(bookings)
  const [search, setSearch]       = useState('')
  const [activeFilter, setFilter] = useState('all')
  const [sheetId, setSheetId]     = useState<string | null>(null)
  const [statusBusy, setBusy]     = useState(false)

  useEffect(() => { setRows(bookings) }, [bookings])
  useEffect(() => {
    if (sheetId && !rows.some((r) => r.id === sheetId)) setSheetId(null)
  }, [rows, sheetId])

  const filtered = rows
    .filter((r) => activeFilter === 'all' || r.status === activeFilter)
    .filter((r) => (r.client_name || '').toLowerCase().includes(search.toLowerCase()))

  const detail = sheetId ? rows.find((r) => r.id === sheetId) ?? null : null

  const downloadPdf = async (bookingId: string) => {
    const toastId = toast.loading('Generando PDF...')
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pdf`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = window.URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `reserva-${bookingId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado', { id: toastId })
    } catch {
      toast.error('No se pudo descargar el PDF', { id: toastId })
    }
  }

  const patchStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setBusy(true)
    try {
      const result = await updateBookingStatus(bookingId, status)
      if (result.error) { toast.error(result.error); return }
      toast.success(status === 'confirmed' ? 'Reserva confirmada' : 'Reserva cancelada')
      setRows((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)))
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E] transition-[color,border-color,box-shadow] duration-150"
        />
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-4 py-2 text-[13px] rounded-lg font-medium transition-colors duration-150 active:scale-[0.97]',
                activeFilter === f.value
                  ? 'bg-[#0F766E] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC] hover:border-[#D1D5DB]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-2.5 py-20 bg-white border border-[#E5E7EB] rounded-xl">
          <span className="flex items-center justify-center h-10 w-10 rounded-full bg-[#F8FAFC]">
            <CalendarDays className="h-[18px] w-[18px] text-[#9CA3AF]" strokeWidth={1.5} />
          </span>
          <p className="text-[14px] font-medium text-[#111827]">Sin reservas</p>
          <p className="text-[13px] text-[#6B7280] max-w-xs">No hay resultados con los filtros actuales.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-0">
          {filtered.map((b) => {
            const s = statusMap[b.status] ?? statusMap.pending
            return (
              <div
                key={b.id}
                className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex gap-4 items-start hover:border-[#0F766E]/30 transition-[border-color,box-shadow] duration-150 hover:shadow-[0_2px_12px_rgba(15,23,42,0.05)]"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#CCFBF1] text-[#0F766E] font-semibold text-[13px] flex items-center justify-center shrink-0">
                  {(b.client_name || '').substring(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-[#111827]">{b.client_name}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#6B7280] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{b.menus?.name ?? '—'}</span>
                    <span className="text-[#9CA3AF]">·</span>
                    <span>{b.guests} pax</span>
                  </div>
                  {b.event_date && (
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mt-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={1.5} />
                      {new Date(b.event_date).toLocaleDateString('es-ES', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {(b as any).event_time && ` · ${(b as any).event_time.slice(0, 5)}`}
                    </div>
                  )}
                  {b.client_email && (
                    <div className="text-[13px] text-[#9CA3AF] mt-0.5">{b.client_email}</div>
                  )}
                </div>

                {/* Actions + amount */}
                <div className="flex flex-col items-end shrink-0 gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-[#6B7280] hover:bg-[#F8FAFC] hover:border-[#D1D5DB] focus:outline-none transition-colors duration-150 active:scale-[0.94]"
                        aria-label="Acciones"
                      >
                        <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-lg border-[#E5E7EB] shadow-lg">
                      <DropdownMenuItem className="cursor-pointer text-[14px]" onSelect={() => setSheetId(b.id)}>
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-[14px]" onSelect={() => downloadPdf(b.id)}>
                        <FileDown className="h-4 w-4" strokeWidth={1.5} />
                        Descargar PDF
                      </DropdownMenuItem>
                      {b.status === 'pending' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-[14px]" onSelect={() => patchStatus(b.id, 'confirmed')}>
                            Confirmar
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" className="cursor-pointer text-[14px]" onSelect={() => patchStatus(b.id, 'cancelled')}>
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="text-[15px] font-semibold text-[#111827] tabular-nums">
                    {formatCurrency(b.total_amount ?? 0)}
                  </div>
                  <div className="text-[12px] text-[#9CA3AF]">
                    Fianza: {formatCurrency((b as any).deposit_amount ?? 0)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!sheetId} onOpenChange={(open) => !open && setSheetId(null)}>
        <SheetContent
          side="right"
          className="w-full max-w-[min(100vw,480px)] sm:max-w-[480px] border-l border-[#E5E7EB] bg-white p-0 flex flex-col overflow-hidden"
        >
          {detail && (
            <>
              <SheetHeader className="px-6 py-5 border-b border-[#E5E7EB] space-y-2 pr-14">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-[17px] font-semibold text-[#111827] text-left leading-tight">
                    {detail.client_name}
                  </SheetTitle>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${(statusMap[detail.status] ?? statusMap.pending).cls}`}>
                    {(statusMap[detail.status] ?? statusMap.pending).label}
                  </span>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Event info */}
                <div>
                  <p className="text-[13px] font-semibold text-[#111827] mb-3">Info del evento</p>
                  <div className="space-y-3">
                    <div>
                      <p className={fieldLabel}>Fecha</p>
                      <p className="text-[14px] font-medium text-[#111827]">
                        {detail.event_date
                          ? new Date(detail.event_date).toLocaleDateString('es-ES', {
                              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                            })
                          : '—'}
                        {(detail as any).event_time ? ` · ${(detail as any).event_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className={fieldLabel}>Personas</p>
                      <p className="text-[14px] font-medium text-[#111827]">{detail.guests}</p>
                    </div>
                    {(detail as any).location && (
                      <div>
                        <p className={fieldLabel}>Ubicación</p>
                        <p className="text-[14px] font-medium text-[#111827]">{(detail as any).location}</p>
                      </div>
                    )}
                    <div>
                      <p className={fieldLabel}>Contacto</p>
                      <p className="text-[14px] font-medium text-[#111827]">{detail.client_email}</p>
                      {(detail as any).client_phone && (
                        <p className="text-[14px] font-medium text-[#111827]">{(detail as any).client_phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu */}
                <div className="border-t border-[#E5E7EB] pt-5">
                  <p className="text-[13px] font-semibold text-[#111827] mb-2">Menú contratado</p>
                  <p className="text-[14px] font-medium text-[#111827]">{detail.menus?.name ?? '—'}</p>
                  <p className="text-[13px] text-[#6B7280] mt-1">
                    El detalle de platos está disponible en la sección Menús.
                  </p>
                </div>

                {/* Financials */}
                <div className="border-t border-[#E5E7EB] pt-5">
                  <p className="text-[13px] font-semibold text-[#111827] mb-3">Resumen económico</p>
                  {(() => {
                    const total = detail.total_amount ?? 0
                    const { subtotal, iva } = splitVat(total)
                    return (
                      <table className="w-full text-[14px]">
                        <tbody>
                          <tr className="border-b border-[#E5E7EB]">
                            <td className="py-2 text-[#6B7280]">Base imponible (est.)</td>
                            <td className="py-2 text-right font-medium text-[#111827] tabular-nums">{formatCurrency(subtotal)}</td>
                          </tr>
                          <tr className="border-b border-[#E5E7EB]">
                            <td className="py-2 text-[#6B7280]">IVA (21%)</td>
                            <td className="py-2 text-right font-medium text-[#111827] tabular-nums">{formatCurrency(iva)}</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-semibold text-[#111827]">Total</td>
                            <td className="py-2 text-right font-semibold text-[#0F766E] tabular-nums">{formatCurrency(total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    )
                  })()}
                  <p className="text-[12px] text-[#9CA3AF] mt-2">Desglose orientativo (IVA 21%).</p>
                </div>

                {/* Notes */}
                <div className="border-t border-[#E5E7EB] pt-5">
                  <label className={fieldLabel}>Notas internas</label>
                  <textarea
                    readOnly
                    value={detail.notes ?? ''}
                    placeholder="Sin notas"
                    rows={4}
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] resize-none focus:outline-none cursor-default"
                  />
                </div>
              </div>

              <SheetFooter className="px-6 py-4 border-t border-[#E5E7EB] flex flex-row gap-3 sm:justify-start bg-white">
                <button
                  type="button"
                  onClick={() => downloadPdf(detail.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[14px] font-medium text-[#111827] hover:bg-[#F8FAFC] hover:border-[#D1D5DB] transition-colors duration-150 active:scale-[0.97]"
                >
                  <FileDown className="h-4 w-4" strokeWidth={1.5} />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  disabled={detail.status !== 'pending' || statusBusy}
                  onClick={() => patchStatus(detail.id, 'confirmed')}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#115E59] disabled:opacity-40 disabled:pointer-events-none transition-colors duration-150 active:scale-[0.97] disabled:active:scale-100"
                >
                  Confirmar reserva
                </button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
