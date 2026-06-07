'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { updateBookingStatus } from '../actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Calendar,
  User,
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

import './calendar.css'

type Booking = {
  id: string
  tenant_id: string
  menu_id: string
  event_date: string
  event_time?: string | null
  guests: number
  client_name: string
  client_email: string
  client_phone: string | null
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid_full'
  notes: string | null
  menus?: { name: string } | null
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function bookingToStartEnd(b: Booking) {
  const date = b.event_date
  let time = '12:00:00'
  if (b.event_time && b.event_time.length >= 5) {
    const hm = b.event_time.trim().slice(0, 5)
    time = /^\d{2}:\d{2}$/.test(hm) ? `${hm}:00` : '12:00:00'
  }
  const start = new Date(`${date}T${time}`)
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date(`${date}T12:00:00`)
    const end = new Date(fallback)
    end.setHours(end.getHours() + 1)
    return {
      start: `${date}T12:00:00`,
      end: `${toYMD(end)}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:00`,
    }
  }
  const end = new Date(start)
  end.setHours(end.getHours() + 1)
  return {
    start: `${date}T${pad2(start.getHours())}:${pad2(start.getMinutes())}:00`,
    end: `${date}T${pad2(end.getHours())}:${pad2(end.getMinutes())}:00`,
  }
}

function eventStatusClass(b: Booking) {
  if (b.status === 'confirmed' || b.status === 'paid_full') return 'fc-event-confirmed'
  if (b.status === 'pending') return 'fc-event-pending'
  return 'fc-event-cancelled'
}

type ViewKey = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

export function CalendarView({ initialBookings }: { initialBookings: Booking[] }) {
  const calRef = useRef<FullCalendar>(null)
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const now = new Date()
  const [calendarTitle, setCalendarTitle] = useState('')
  const [activeView, setActiveView] = useState<ViewKey>('dayGridMonth')
  const [statsMonth, setStatsMonth] = useState({ y: now.getFullYear(), m: now.getMonth() })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDayStr, setSheetDayStr] = useState<string | null>(null)

  const api = () => calRef.current?.getApi()

  const events = useMemo(() => {
    return bookings.map((b) => {
      const { start, end } = bookingToStartEnd(b)
      return {
        id: b.id,
        title: `${b.client_name} — ${b.guests} pax`,
        start,
        end,
        extendedProps: { booking: b },
      }
    })
  }, [bookings])

  const monthStats = useMemo(() => {
    const { y, m } = statsMonth
    const inMonth = bookings.filter((b) => {
      const d = new Date(`${b.event_date}T12:00:00`)
      return d.getFullYear() === y && d.getMonth() === m
    })
    const confirmed = inMonth.filter(
      (b) => b.status === 'confirmed' || b.status === 'paid_full',
    ).length
    const pending = inMonth.filter((b) => b.status === 'pending').length
    return { total: inMonth.length, confirmed, pending }
  }, [bookings, statsMonth])

  const sheetDayBookings = useMemo(() => {
    if (!sheetDayStr) return []
    return bookings
      .filter((b) => b.event_date === sheetDayStr)
      .sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''))
  }, [bookings, sheetDayStr])

  const openDaySheet = useCallback((dayStr: string) => {
    setSheetDayStr(dayStr)
    setSheetOpen(true)
  }, [])

  const handleStatusUpdate = async (status: 'confirmed' | 'cancelled') => {
    if (!selectedBooking) return

    setIsUpdating(true)
    const result = await updateBookingStatus(selectedBooking.id, status)
    setIsUpdating(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Reserva ${status === 'confirmed' ? 'confirmada' : 'cancelada'}`)

      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBooking.id ? { ...b, status } : b)),
      )

      setSelectedBooking((prev) => (prev ? { ...prev, status } : null))
      setIsModalOpen(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedBooking) return
    setIsUpdating(true)
    const toastId = toast.loading('Generando PDF...')

    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}/pdf`)
      if (!response.ok) throw new Error('Error al generar PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reserva-${selectedBooking.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('PDF descargado correctamente', { id: toastId })
    } catch {
      toast.error('No se pudo descargar el PDF', { id: toastId })
    } finally {
      setIsUpdating(false)
    }
  }

  const statusBadgeClass = (status: Booking['status']) => {
    if (status === 'confirmed' || status === 'paid_full') {
      return 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/20'
    }
    if (status === 'pending') return 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20'
    return 'bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20'
  }

  const statusLabel = (status: Booking['status']) => {
    if (status === 'confirmed') return 'Confirmado'
    if (status === 'pending') return 'Pendiente'
    if (status === 'cancelled') return 'Cancelado'
    return 'Completada'
  }

  const sheetBarClass = (status: Booking['status']) => {
    if (status === 'confirmed' || status === 'paid_full') return 'border-l-[#0F766E]'
    if (status === 'pending') return 'border-l-[#D97706]'
    return 'border-l-[#DC2626]'
  }

  const sheetDayLabel = sheetDayStr
    ? new Date(`${sheetDayStr}T12:00:00`).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
            Calendario maestro
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1">
            Visualiza los eventos operativos centralizados de tu agenda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(
            [
              ['dayGridMonth', 'Mes'],
              ['timeGridWeek', 'Semana'],
              ['timeGridDay', 'Día'],
            ] as const
          ).map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                api()?.changeView(view)
                setActiveView(view)
              }}
              className={cn(
                'rounded-lg px-4 py-2 text-[15px] font-medium transition-colors',
                activeView === view
                  ? 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                  : 'border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F8FAFC]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden p-0">
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-[#E5E7EB] sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-fit rounded-lg border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC] text-[15px] font-medium"
            onClick={() => api()?.today()}
          >
            Hoy
          </Button>
          <div className="flex items-center justify-center gap-2 flex-1 order-first sm:order-none">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC] transition-colors"
              onClick={() => api()?.prev()}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="font-heading text-[17px] font-semibold text-[#111827] min-w-[12rem] text-center capitalize">
              {calendarTitle || '…'}
            </h2>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC] transition-colors"
              onClick={() => api()?.next()}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="hidden sm:block w-[72px] shrink-0" aria-hidden />
        </div>

        <div className="fc-caterix-wrap px-0">
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            locale={esLocale}
            firstDay={1}
            events={events}
            dayMaxEvents={2}
            moreLinkClick={(arg) => {
              arg.jsEvent.preventDefault()
              openDaySheet(toYMD(arg.date))
            }}
            datesSet={(arg) => {
              setCalendarTitle(arg.view.title)
              setActiveView(arg.view.type as ViewKey)
              const mid = arg.view.calendar.getDate()
              setStatsMonth({ y: mid.getFullYear(), m: mid.getMonth() })
            }}
            dateClick={(info) => {
              openDaySheet(info.dateStr)
            }}
            eventClick={(info) => {
              info.jsEvent.preventDefault()
              const start = info.event.start
              const dayStr = start ? toYMD(start) : info.event.startStr.slice(0, 10)
              openDaySheet(dayStr)
            }}
            eventClassNames={(arg) => {
              const b = arg.event.extendedProps.booking as Booking | undefined
              if (!b) return []
              return [eventStatusClass(b)]
            }}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            scrollTime="08:00:00"
            allDaySlot={true}
            height={activeView === 'dayGridMonth' ? 'auto' : undefined}
            contentHeight={activeView === 'dayGridMonth' ? undefined : 560}
            eventDisplay="block"
            nowIndicator
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-3 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[#0F766E] shrink-0" />
          <p className="text-[15px] font-medium text-[#6B7280]">
            <span className="font-semibold text-[#111827] tabular-nums">{monthStats.total}</span> eventos
            este mes
          </p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-3 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-[#16A34A] shrink-0" />
          <p className="text-[15px] font-medium text-[#6B7280]">
            <span className="font-semibold text-[#111827] tabular-nums">{monthStats.confirmed}</span>{' '}
            confirmados
          </p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-[#D97706] shrink-0" />
          <p className="text-[15px] font-medium text-[#6B7280]">
            <span className="font-semibold text-[#111827] tabular-nums">{monthStats.pending}</span>{' '}
            pendientes
          </p>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[min(100vw,400px)] sm:max-w-[400px] border-l border-[#E5E7EB] bg-white p-0 flex flex-col gap-0"
        >
          <SheetHeader className="p-6 border-b border-[#E5E7EB] text-left space-y-1 pr-12">
            <SheetTitle className="font-heading font-semibold text-[#111827] text-[17px] capitalize">
              {sheetDayLabel}
            </SheetTitle>
            <p className="text-[15px] text-[#6B7280]">
              {sheetDayBookings.length} evento
              {sheetDayBookings.length !== 1 ? 's' : ''}
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {sheetDayBookings.length === 0 ? (
              <p className="text-[15px] text-[#9CA3AF] text-center py-8">
                No hay reservas este día.
              </p>
            ) : (
              sheetDayBookings.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    'bg-white border border-[#E5E7EB] rounded-lg p-3 mb-2 border-l-4',
                    sheetBarClass(b.status),
                  )}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-[15px] font-semibold text-[#111827]">{b.client_name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-none shrink-0',
                        statusBadgeClass(b.status),
                      )}
                    >
                      {statusLabel(b.status)}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-[#6B7280] mt-1">
                    Menú:{' '}
                    {b.menus && !Array.isArray(b.menus) ? b.menus.name : '—'} · {b.guests}{' '}
                    pax
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <button
                      type="button"
                      className="text-[13px] text-[#0F766E] hover:text-[#115E59] font-medium transition-colors"
                      onClick={() => {
                        setSelectedBooking(b)
                        setIsModalOpen(true)
                      }}
                    >
                      Ver reserva
                    </button>
                    <span className="text-[15px] font-semibold text-[#111827] tabular-nums">
                      {formatCurrency(b.total_amount ?? 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border border-[#E5E7EB] rounded-xl text-[#111827] shadow-lg p-0 overflow-hidden sm:max-w-lg">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-[22px] font-heading font-semibold text-[#111827]">
                Operativa de reserva
              </DialogTitle>
              <DialogDescription className="text-[15px] text-[#6B7280] mt-1">
                Revisa los datos y ajusta el estado operativo del evento seleccionado.
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6 mt-6">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[11px] uppercase font-semibold tracking-widest">
                        Cliente
                      </span>
                    </div>
                    <div className="font-semibold text-[#111827]">
                      {selectedBooking.client_name}
                    </div>
                    <div className="text-[15px] text-[#6B7280] mt-0.5">
                      {selectedBooking.client_email}
                    </div>
                    {selectedBooking.client_phone && (
                      <div className="text-[15px] text-[#6B7280] mt-0.5">
                        {selectedBooking.client_phone}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[#9CA3AF] mb-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[11px] uppercase font-semibold tracking-widest">
                        Detalles
                      </span>
                    </div>
                    <div className="font-semibold text-[#0F766E] line-clamp-1">
                      {selectedBooking.menus && !Array.isArray(selectedBooking.menus)
                        ? selectedBooking.menus.name
                        : 'Desconocido'}
                    </div>
                    <div className="text-[15px] text-[#6B7280] mt-0.5">
                      {new Date(selectedBooking.event_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[15px] text-[#6B7280] mt-0.5">
                      {selectedBooking.guests} pax totales
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end border-b border-[#E5E7EB] pb-4">
                  <div>
                    <div className="text-[11px] uppercase font-semibold tracking-widest text-[#9CA3AF] mb-1">
                      Presupuesto aceptado
                    </div>
                    <div className="font-semibold text-[28px] text-[#111827] font-mono tabular-nums tracking-tight">
                      {selectedBooking.total_amount.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(selectedBooking.status)}`}
                    >
                      {statusLabel(selectedBooking.status)}
                    </span>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="bg-[#FEF3C7] border-l-4 border-[#D97706] p-3 rounded-r-lg">
                    <div className="flex items-center gap-1.5 text-[#6B7280] mb-1">
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold uppercase tracking-widest">
                        Notas cliente
                      </span>
                    </div>
                    <div className="text-[15px] text-[#111827] italic">
                      {selectedBooking.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#F8FAFC] border-t border-[#E5E7EB] p-4 px-6 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-2">
            {selectedBooking?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#DC2626]/30 rounded-lg sm:mr-auto"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                >
                  Descartar reserva
                </Button>
                <Button
                  className="bg-[#0F766E] text-white hover:bg-[#115E59] font-medium rounded-lg"
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={isUpdating}
                >
                  Confirmar operatoria
                </Button>
              </>
            )}
            {selectedBooking?.status === 'confirmed' && (
              <Button
                variant="outline"
                className="bg-white border border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC] rounded-lg"
                onClick={handleDownloadPDF}
                disabled={isUpdating}
              >
                <Download className="w-4 h-4 mr-2" />
                Factura proforma (PDF)
              </Button>
            )}
            <Button
              variant="outline"
              className="border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC] rounded-lg"
              onClick={() => setIsModalOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
