'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  Copy,
  Edit3,
  FileDown,
  FileText,
  Mail,
  MoreVertical,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { Quote } from './page'
import { deleteQuote, duplicateQuote, sendQuote } from './actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Borrador' },
  { key: 'sent', label: 'Enviado' },
  { key: 'accepted', label: 'Aceptado' },
  { key: 'rejected', label: 'Rechazado' },
  { key: 'expired', label: 'Expirado' },
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isExpired(iso: string | null) {
  if (!iso) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(iso) < today
}

export function ClientQuotes({ quotes }: { quotes: Quote[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<Quote[]>(quotes)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(quotes)
  }, [quotes])

  const filtered = rows
    .filter((quote) => activeFilter === 'all' || quote.status === activeFilter)
    .filter((quote) => {
      const term = search.toLowerCase()
      return (
        (quote.client_name ?? '').toLowerCase().includes(term) ||
        (quote.client_email ?? '').toLowerCase().includes(term) ||
        (quote.event_type ?? '').toLowerCase().includes(term) ||
        (quote.menu_name ?? '').toLowerCase().includes(term)
      )
    })

  const runAction = (
    id: string,
    promise: () => Promise<{ error?: string; success?: boolean } | void>,
    messages: { loading: string; success: string; error: string },
  ) => {
    setBusyId(id)
    const toastId = toast.loading(messages.loading)
    startTransition(async () => {
      try {
        const result = await promise()
        if (result?.error) {
          toast.error(result.error, { id: toastId })
          return
        }
        toast.success(messages.success, { id: toastId })
        router.refresh()
      } catch {
        toast.error(messages.error, { id: toastId })
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleSend = (quote: Quote) =>
    runAction(
      quote.id,
      async () => {
        const result = await sendQuote(quote.id)
        if (!result.error) {
          setRows((prev) =>
            prev.map((row) =>
              row.id === quote.id ? { ...row, status: 'sent' } : row,
            ),
          )
        }
        return result
      },
      {
        loading: 'Enviando presupuesto...',
        success: 'Presupuesto marcado como enviado',
        error: 'No se pudo enviar el presupuesto',
      },
    )

  const handleDuplicate = (quote: Quote) =>
    runAction(quote.id, () => duplicateQuote(quote.id), {
      loading: 'Duplicando presupuesto...',
      success: 'Presupuesto duplicado',
      error: 'No se pudo duplicar el presupuesto',
    })

  const handleDelete = (quote: Quote) => {
    if (!confirm(`Eliminar el presupuesto de "${quote.client_name}"?`)) return

    runAction(
      quote.id,
      async () => {
        const result = await deleteQuote(quote.id)
        if (!result.error) {
          setRows((prev) => prev.filter((row) => row.id !== quote.id))
        }
        return result
      },
      {
        loading: 'Eliminando...',
        success: 'Presupuesto eliminado',
        error: 'No se pudo eliminar el presupuesto',
      },
    )
  }

  const copyPublicLink = async (quote: Quote) => {
    if (!quote.accept_token) {
      toast.error('Este presupuesto no tiene enlace publico')
      return
    }

    const url = `${window.location.origin}/quotes/${quote.accept_token}`
    await navigator.clipboard.writeText(url)
    toast.success('Enlace publico copiado')
  }

  const downloadPdf = async (quote: Quote) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="w-full max-w-sm">
          <input
            type="text"
            placeholder="Buscar por cliente, email o evento..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'px-4 py-2 text-[15px] rounded-lg font-medium transition-colors',
                activeFilter === tab.key
                  ? 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="font-heading text-[17px] font-semibold text-[#111827] mb-4">
        Lista de presupuestos
      </h2>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#E5E7EB] rounded-xl">
          <FileText className="w-12 h-12 mx-auto text-[#9CA3AF] mb-4" />
          <p className="font-heading font-semibold text-[#111827]">
            Sin presupuestos todavia
          </p>
          <p className="text-[15px] text-[#6B7280] mt-1">
            Crea tu primer presupuesto y enviaselo a un cliente.
          </p>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center gap-2 mt-6 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium px-4 py-2 text-[15px] transition-colors"
          >
            Crear presupuesto
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => {
            const status = STATUS_MAP[quote.status] ?? STATUS_MAP.draft
            const expired = isExpired(quote.valid_until)
            const busy = busyId === quote.id || isPending

            return (
              <div
                key={quote.id}
                className={cn(
                  'bg-white border border-[#E5E7EB] rounded-xl p-4',
                  'hover:border-[#0F766E]/30 transition-colors duration-150',
                  busyId === quote.id && 'opacity-60 pointer-events-none',
                )}
              >
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#0F766E] font-semibold text-[15px] flex items-center justify-center shrink-0">
                    {initials(quote.client_name || '?')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold text-[#111827]">
                        {quote.client_name}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          status.cls,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="text-[15px] text-[#6B7280] mt-1">
                      {quote.menu_name ?? '-'}
                      {quote.guests != null && (
                        <>
                          <span className="mx-1.5 text-[#E5E7EB]">·</span>
                          {quote.guests} pax
                        </>
                      )}
                    </div>

                    {quote.event_date && (
                      <div className="flex items-center gap-1.5 text-[13px] text-[#9CA3AF] mt-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatDate(quote.event_date)}
                      </div>
                    )}

                    {quote.client_email && (
                      <div className="flex items-center gap-1.5 text-[13px] text-[#9CA3AF] mt-1">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="lowercase truncate">
                          {quote.client_email}
                        </span>
                      </div>
                    )}

                    {quote.valid_until && (
                      <div
                        className={cn(
                          'flex items-center gap-1.5 text-[13px] mt-1',
                          expired ? 'text-[#DC2626]' : 'text-[#9CA3AF]',
                        )}
                      >
                        <Clock className="h-3 w-3 shrink-0" />
                        Valido hasta: {formatDate(quote.valid_until)}
                        {expired && ' · Expirado'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-[#6B7280] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 disabled:opacity-50 transition-colors"
                          aria-label="Acciones del presupuesto"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-52 bg-white border border-[#E5E7EB] rounded-lg shadow-md"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() =>
                            router.push(`/dashboard/quotes/${quote.id}`)
                          }
                        >
                          <FileText className="h-4 w-4" />
                          Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={quote.status !== 'draft'}
                          className="cursor-pointer"
                          onSelect={() =>
                            router.push(`/dashboard/quotes/${quote.id}`)
                          }
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => downloadPdf(quote)}
                        >
                          <FileDown className="h-4 w-4" />
                          PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!quote.accept_token}
                          className="cursor-pointer"
                          onSelect={() => copyPublicLink(quote)}
                        >
                          <Copy className="h-4 w-4" />
                          Copiar enlace
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          disabled={!['draft', 'sent'].includes(quote.status)}
                          className="cursor-pointer"
                          onSelect={() => handleSend(quote)}
                        >
                          <Send className="h-4 w-4" />
                          Enviar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => handleDuplicate(quote)}
                        >
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!['draft', 'rejected', 'expired'].includes(quote.status)}
                          className="cursor-pointer text-[#DC2626] focus:text-[#DC2626]"
                          onSelect={() => handleDelete(quote)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="text-[15px] font-semibold text-[#111827] mt-1 tabular-nums">
                      {formatCurrency(quote.total ?? 0)}
                    </div>
                    <div className="text-[13px] text-[#9CA3AF] tabular-nums">
                      Fianza: {formatCurrency(quote.deposit_amount ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
