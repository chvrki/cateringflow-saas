'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Loader2,
  Mail,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { Quote } from '../page'
import { deleteQuote, duplicateQuote, sendQuote, updateQuote } from '../actions'

const STATUS_MAP: Record<Quote['status'], { label: string; cls: string }> = {
  draft: {
    label: 'Borrador',
    cls: 'bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB]',
  },
  sent: {
    label: 'Enviado',
    cls: 'bg-[#CCFBF1] text-[#0F766E] border border-[#0F766E]/20',
  },
  accepted: {
    label: 'Aceptado',
    cls: 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/20',
  },
  rejected: {
    label: 'Rechazado',
    cls: 'bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20',
  },
  expired: {
    label: 'Expirado',
    cls: 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20',
  },
}

const fieldLabel =
  'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5 block'
const inputClass =
  'w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 transition-colors duration-150'

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function asInputDate(iso: string | null) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className={fieldLabel}>{label}</p>
      <div className="text-[15px] font-medium text-[#111827]">{value || '-'}</div>
    </div>
  )
}

function TimelineItem({
  label,
  active,
  value,
}: {
  label: string
  active: boolean
  value?: string | null
}) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'mt-0.5 h-7 w-7 rounded-full border flex items-center justify-center shrink-0',
          active
            ? 'bg-[#0F766E] border-[#0F766E] text-white'
            : 'bg-white border-[#E5E7EB] text-[#9CA3AF]',
        )}
      >
        <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#111827]">{label}</p>
        <p className="text-[13px] text-[#6B7280]">{value ? formatDate(value) : '-'}</p>
      </div>
    </div>
  )
}

export function QuoteDetail({ quote }: { quote: Quote }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const status = STATUS_MAP[quote.status] ?? STATUS_MAP.draft
  const canEdit = quote.status === 'draft'

  const publicLink = useMemo(() => {
    if (!quote.accept_token || typeof window === 'undefined') return ''
    return `${window.location.origin}/quotes/${quote.accept_token}`
  }, [quote.accept_token])

  const runAction = (
    action: () => Promise<{ error?: string; success?: boolean } | void>,
    messages: { loading: string; success: string; error: string },
  ) => {
    const toastId = toast.loading(messages.loading)
    startTransition(async () => {
      try {
        const result = await action()
        if (result?.error) {
          toast.error(result.error, { id: toastId })
          return
        }
        toast.success(messages.success, { id: toastId })
        router.refresh()
      } catch {
        toast.error(messages.error, { id: toastId })
      }
    })
  }

  const handleUpdate = (formData: FormData) => {
    runAction(
      async () => {
        const result = await updateQuote(quote.id, formData)
        if (!result.error) setEditing(false)
        return result
      },
      {
        loading: 'Guardando cambios...',
        success: 'Presupuesto actualizado',
        error: 'No se pudo actualizar el presupuesto',
      },
    )
  }

  const copyLink = async () => {
    if (!publicLink) {
      toast.error('Este presupuesto no tiene enlace público')
      return
    }
    await navigator.clipboard.writeText(publicLink)
    toast.success('Enlace público copiado')
  }

  const downloadPdf = async () => {
    const toastId = toast.loading('Generando PDF...')
    try {
      const response = await fetch(`/api/quotes/${quote.id}/pdf`)
      if (!response.ok) throw new Error('PDF failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `presupuesto-${quote.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF descargado correctamente', { id: toastId })
    } catch {
      toast.error('No se pudo descargar el PDF', { id: toastId })
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-1.5 text-[14px] mb-2">
            <Link
              href="/dashboard/quotes"
              className="text-[#0F766E] hover:text-[#115E59] font-medium transition-colors duration-150"
            >
              Presupuestos
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={1.5} />
            <span className="text-[#111827] font-medium">
              {quote.client_name}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
              Presupuesto
            </h1>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                status.cls,
              )}
            >
              {status.label}
            </span>
          </div>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            {quote.menu_name ?? 'Sin menú'} · {quote.guests ?? 0} pax ·{' '}
            {formatCurrency(quote.total ?? 0)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.97]"
            >
              {editing ? 'Cancelar edición' : 'Editar'}
            </button>
          )}
          {['draft', 'sent'].includes(quote.status) && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                runAction(() => sendQuote(quote.id), {
                  loading: 'Enviando presupuesto...',
                  success: 'Presupuesto marcado como enviado',
                  error: 'No se pudo enviar el presupuesto',
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium px-4 py-2 text-[14px] transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={1.5} />
              )}
              Enviar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-5">
          <form action={handleUpdate} className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="font-heading text-[17px] font-semibold text-[#111827]">
                Información completa
              </h2>
              {editing && (
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium px-4 py-2 text-[14px] transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
                >
                  Guardar cambios
                </button>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client_name" className={fieldLabel}>
                    Cliente
                  </label>
                  <input
                    id="client_name"
                    name="client_name"
                    defaultValue={quote.client_name}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="client_email" className={fieldLabel}>
                    Email
                  </label>
                  <input
                    id="client_email"
                    name="client_email"
                    type="email"
                    defaultValue={quote.client_email ?? ''}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="client_phone" className={fieldLabel}>
                    Teléfono
                  </label>
                  <input
                    id="client_phone"
                    name="client_phone"
                    defaultValue={quote.client_phone ?? ''}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="event_type" className={fieldLabel}>
                    Tipo de evento
                  </label>
                  <input
                    id="event_type"
                    name="event_type"
                    defaultValue={quote.event_type ?? ''}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="event_date" className={fieldLabel}>
                    Fecha del evento
                  </label>
                  <input
                    id="event_date"
                    name="event_date"
                    type="date"
                    defaultValue={asInputDate(quote.event_date)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="guests" className={fieldLabel}>
                    Personas
                  </label>
                  <input
                    id="guests"
                    name="guests"
                    type="number"
                    min={1}
                    defaultValue={quote.guests ?? 1}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="location" className={fieldLabel}>
                    Ubicación
                  </label>
                  <input
                    id="location"
                    name="location"
                    defaultValue={quote.location ?? ''}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="valid_until" className={fieldLabel}>
                    Válido hasta
                  </label>
                  <input
                    id="valid_until"
                    name="valid_until"
                    type="date"
                    defaultValue={asInputDate(quote.valid_until)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="deposit_amount" className={fieldLabel}>
                    Fianza
                  </label>
                  <input
                    id="deposit_amount"
                    name="deposit_amount"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={quote.deposit_amount ?? 0}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="legal_terms" className={fieldLabel}>
                    Condiciones legales
                  </label>
                  <textarea
                    id="legal_terms"
                    name="legal_terms"
                    rows={5}
                    defaultValue={quote.legal_terms ?? ''}
                    className={cn(inputClass, 'resize-none')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className={fieldLabel}>
                    Notas internas
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={quote.notes ?? ''}
                    className={cn(inputClass, 'resize-none bg-[#F8FAFC]')}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label="Cliente" value={quote.client_name} />
                <InfoRow label="Email" value={quote.client_email} />
                <InfoRow label="Teléfono" value={quote.client_phone} />
                <InfoRow label="Tipo de evento" value={quote.event_type} />
                <InfoRow label="Fecha del evento" value={formatDate(quote.event_date)} />
                <InfoRow label="Personas" value={quote.guests} />
                <div className="sm:col-span-2">
                  <InfoRow label="Ubicación" value={quote.location} />
                </div>
                <InfoRow label="Válido hasta" value={formatDate(quote.valid_until)} />
                <InfoRow label="Menú" value={quote.menu_name} />
              </div>
            )}
          </form>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="font-heading text-[17px] font-semibold text-[#111827] mb-4">
              Resumen economico
            </h2>
            <table className="w-full text-[15px]">
              <tbody>
                <tr className="border-b border-[#E5E7EB]">
                  <td className="py-2 text-[#6B7280]">
                    {formatCurrency(quote.price_per_pax ?? 0)} x {quote.guests ?? 0} pax
                  </td>
                  <td className="py-2 text-right font-medium text-[#111827] tabular-nums">
                    {formatCurrency(quote.subtotal ?? 0)}
                  </td>
                </tr>
                <tr className="border-b border-[#E5E7EB]">
                  <td className="py-2 text-[#6B7280]">IVA 21%</td>
                  <td className="py-2 text-right font-medium text-[#111827] tabular-nums">
                    {formatCurrency(quote.tax_amount ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-[#111827]">Total</td>
                  <td className="py-3 text-right text-[19px] font-semibold text-[#0F766E] tabular-nums">
                    {formatCurrency(quote.total ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-[#6B7280]">Fianza</td>
                  <td className="py-1 text-right font-medium text-[#111827] tabular-nums">
                    {formatCurrency(quote.deposit_amount ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {(quote.legal_terms || quote.notes) && !editing && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
              {quote.legal_terms && (
                <div>
                  <h2 className="font-heading text-[17px] font-semibold text-[#111827] mb-2">
                    Condiciones
                  </h2>
                  <p className="text-[15px] text-[#6B7280] whitespace-pre-wrap">
                    {quote.legal_terms}
                  </p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <h2 className="font-heading text-[17px] font-semibold text-[#111827] mb-2">
                    Notas internas
                  </h2>
                  <p className="text-[15px] text-[#6B7280] whitespace-pre-wrap">
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5 sticky top-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="font-heading text-[15px] font-semibold text-[#111827] mb-4">
              Timeline
            </h2>
            <div className="space-y-4">
              <TimelineItem label="Creado" active value={quote.created_at} />
              <TimelineItem
                label="Enviado"
                active={['sent', 'accepted', 'rejected'].includes(quote.status)}
                value={quote.status !== 'draft' ? quote.updated_at : null}
              />
              <TimelineItem
                label={
                  quote.status === 'rejected'
                    ? 'Rechazado'
                    : quote.status === 'accepted'
                      ? 'Aceptado'
                      : 'Aceptado/Rechazado'
                }
                active={['accepted', 'rejected'].includes(quote.status)}
                value={quote.accepted_at}
              />
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="font-heading text-[15px] font-semibold text-[#111827] mb-4">
              Enlace público
            </h2>
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#6B7280] break-all">
              {publicLink || 'Sin enlace disponible'}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.98]"
            >
              <Copy className="h-4 w-4" strokeWidth={1.5} />
              Copiar enlace
            </button>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="font-heading text-[15px] font-semibold text-[#111827] mb-4">
              Acciones
            </h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={downloadPdf}
                className="w-full inline-flex items-center justify-center gap-2 border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.98]"
              >
                <FileText className="h-4 w-4" strokeWidth={1.5} />
                Descargar PDF
              </button>
              <a
                href={`mailto:${quote.client_email ?? ''}`}
                className="w-full inline-flex items-center justify-center gap-2 border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.98]"
              >
                <Mail className="h-4 w-4" strokeWidth={1.5} />
                Email cliente
              </a>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(() => duplicateQuote(quote.id), {
                    loading: 'Duplicando presupuesto...',
                    success: 'Presupuesto duplicado',
                    error: 'No se pudo duplicar el presupuesto',
                  })
                }
                className="w-full border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                Duplicar
              </button>
              <button
                type="button"
                disabled={
                  isPending || !['draft', 'rejected', 'expired'].includes(quote.status)
                }
                onClick={() => {
                  if (!confirm('¿Eliminar este presupuesto?')) return
                  runAction(() => deleteQuote(quote.id), {
                    loading: 'Eliminando presupuesto...',
                    success: 'Presupuesto eliminado',
                    error: 'No se pudo eliminar el presupuesto',
                  })
                }}
                className="w-full inline-flex items-center justify-center gap-2 border border-[#DC2626]/20 bg-white hover:bg-[#FEE2E2] text-[#DC2626] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                Eliminar
              </button>
            </div>
            <p className="flex items-center gap-1 text-[13px] text-[#9CA3AF] mt-4">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              Última actualización: {formatDate(quote.updated_at)}
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
