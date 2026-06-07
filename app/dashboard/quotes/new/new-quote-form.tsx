'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Send, Clock, FileText, ChevronRight, ArrowRight, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { MenuOption } from './page'

/* ─── Schema (mirrors actions.ts, client-side validation) ───── */
const schema = z.object({
  client_name: z.string().min(2, 'Mínimo 2 caracteres'),
  client_email: z.string().email('Email no válido'),
  client_phone: z.string().optional(),
  event_type: z.string().optional(),
  event_date: z.string().min(1, 'La fecha del evento es obligatoria'),
  guests: z.coerce
    .number({ invalid_type_error: 'Número requerido' })
    .min(1, 'Mínimo 1 persona'),
  location: z.string().optional(),
  menu_id: z.string().min(1, 'Selecciona un menú'),
  valid_until: z.string().min(1, 'Indica la fecha de validez'),
  deposit_amount: z.coerce.number().min(0).optional(),
  legal_terms: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const TAX_RATE = 0.21

/* ─── Helpers ────────────────────────────────────────────────── */
function defaultValidUntil() {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toISOString().split('T')[0]
}

function formatDateEs(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/* ─── Sub-components ─────────────────────────────────────────── */
function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-5">
        {title}
      </h2>
      {children}
    </div>
  )
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5 block"
    >
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[13px] text-[#DC2626] mt-1">{message}</p>
}

const inputCls =
  'w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 transition-colors duration-150'

/* ─── Main component ─────────────────────────────────────────── */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('La operacion esta tardando demasiado.'))
    }, timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeout)
        reject(error)
      })
  })
}

export function NewQuoteForm({ menus }: { menus: MenuOption[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState<'draft' | 'send' | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valid_until: defaultValidUntil(),
      guests: 1,
    },
  })

  // Watched values for live preview
  const watched = useWatch({ control })

  const selectedMenu = menus.find((m) => m.id === watched.menu_id)
  const guests = Number(watched.guests) || 0
  const subtotal =
    selectedMenu ? Math.round(selectedMenu.price_per_pax * guests * 100) / 100 : 0
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100
  const depositAmt = Number(watched.deposit_amount) || 0

  /* ── Submit handler ── */
  const onSubmit = (action: 'draft' | 'send') => {
    setFormError(null)

    return handleSubmit(
      (values) => {
        setSubmitting(action)
        const payload = { ...values, action }

        startTransition(async () => {
          try {
            const response = await fetch('/api/quotes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const result = (await response.json()) as {
              id?: string
              error?: string
            }

            if (!response.ok) {
              throw new Error(result.error ?? 'No se pudo guardar el presupuesto')
            }

            if (result?.error) {
              setFormError(result.error)
              toast.error(result.error)
              setSubmitting(null)
              return
            }

            if (result?.id) {
              router.push(`/dashboard/quotes/${result.id}`)
              router.refresh()
              return
            }

            setFormError(
              'El presupuesto se ha guardado, pero no se pudo abrir el detalle.',
            )
            setSubmitting(null)
          } catch (error) {
            console.error('Error creating quote:', error)
            setFormError(
              error instanceof Error
                ? error.message
                : 'No se pudo guardar el presupuesto. Revisa los datos e intentalo de nuevo.',
            )
            toast.error('No se pudo guardar el presupuesto')
            setSubmitting(null)
          }
        })
      },
      (invalidErrors) => {
        const firstError = Object.values(invalidErrors)[0]?.message
        const message =
          typeof firstError === 'string'
            ? firstError
            : 'Revisa los campos obligatorios antes de guardar.'
        setFormError(message)
        toast.error(message)
      },
    )()
  }

  const isBusy = isPending || submitting !== null

  return (
    <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()}>
      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[14px] mb-2">
            <Link
              href="/dashboard/quotes"
              className="text-[#0F766E] hover:text-[#115E59] font-medium transition-colors duration-150"
            >
              Presupuestos
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={1.5} />
            <span className="text-[#111827] font-medium">Nuevo presupuesto</span>
          </div>
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
            Nuevo presupuesto
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            Completa los datos para generar la propuesta.
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/quotes"
            className="border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.97]"
          >
            Cancelar
          </Link>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSubmit('draft')}
            className="border border-[#0F766E]/30 bg-white hover:bg-[#CCFBF1] text-[#0F766E] rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting === 'draft' ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />
            ) : null}
            Guardar borrador
          </button>
        </div>
      </div>

      {formError && (
        <div className="mb-6 rounded-xl border border-[#DC2626]/20 bg-[#FEE2E2] px-4 py-3 text-[15px] font-medium text-[#DC2626]">
          {formError}
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
        {/* ═══ LEFT COLUMN ════════════════════════════════════ */}
        <div className="space-y-5">
          {/* Section 1 — Cliente */}
          <SectionCard title="Datos del cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <FieldLabel htmlFor="client_name">
                  Nombre completo *
                </FieldLabel>
                <input
                  id="client_name"
                  className={inputCls}
                  placeholder="María García López"
                  {...register('client_name')}
                />
                <FieldError message={errors.client_name?.message} />
              </div>

              {/* Email */}
              <div>
                <FieldLabel htmlFor="client_email">Email *</FieldLabel>
                <input
                  id="client_email"
                  type="email"
                  className={inputCls}
                  placeholder="cliente@email.com"
                  {...register('client_email')}
                />
                <FieldError message={errors.client_email?.message} />
              </div>

              {/* Teléfono */}
              <div>
                <FieldLabel htmlFor="client_phone">Teléfono</FieldLabel>
                <input
                  id="client_phone"
                  type="tel"
                  className={inputCls}
                  placeholder="+34 600 000 000"
                  {...register('client_phone')}
                />
                <FieldError message={errors.client_phone?.message} />
              </div>

              {/* Tipo de evento */}
              <div>
                <FieldLabel htmlFor="event_type">Tipo de evento</FieldLabel>
                <select
                  id="event_type"
                  className={inputCls}
                  {...register('event_type')}
                >
                  <option value="">Seleccionar…</option>
                  <option value="Boda">Boda</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Cumpleaños">Cumpleaños</option>
                  <option value="Comunión">Comunión</option>
                  <option value="Otro">Otro</option>
                </select>
                <FieldError message={errors.event_type?.message} />
              </div>
            </div>
          </SectionCard>

          {/* Section 2 — Evento */}
          <SectionCard title="Detalles del evento">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha */}
              <div>
                <FieldLabel htmlFor="event_date">Fecha del evento *</FieldLabel>
                <input
                  id="event_date"
                  type="date"
                  className={inputCls}
                  {...register('event_date')}
                />
                <FieldError message={errors.event_date?.message} />
              </div>

              {/* Personas */}
              <div>
                <FieldLabel htmlFor="guests">Número de personas *</FieldLabel>
                <input
                  id="guests"
                  type="number"
                  min={1}
                  className={inputCls}
                  placeholder="50"
                  {...register('guests')}
                />
                <FieldError message={errors.guests?.message} />
              </div>

              {/* Ubicación — full width */}
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="location">Ubicación</FieldLabel>
                <input
                  id="location"
                  className={inputCls}
                  placeholder="Nombre del local, dirección…"
                  {...register('location')}
                />
                <FieldError message={errors.location?.message} />
              </div>
            </div>
          </SectionCard>

          {/* Section 3 — Menú */}
          <SectionCard title="Menú seleccionado">
            {menus.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-11 h-11 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-5 w-5 text-[#9CA3AF]" strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-medium text-[#111827]">No hay menús publicados</p>
                <p className="text-[14px] text-[#6B7280] mt-1">Crea un menú para poder seleccionarlo aquí.</p>
                <Link
                  href="/dashboard/menus"
                  className="group inline-flex items-center gap-1 text-[#0F766E] hover:text-[#115E59] text-[14px] font-medium mt-3 transition-colors duration-150"
                >
                  Ir a Menús
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.5} />
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {menus.map((menu) => {
                    const selected = watched.menu_id === menu.id
                    return (
                      <button
                        key={menu.id}
                        type="button"
                        onClick={() =>
                          setValue('menu_id', menu.id, { shouldValidate: true })
                        }
                        className={cn(
                          'text-left rounded-lg p-4 cursor-pointer transition-colors duration-150 active:scale-[0.99]',
                          selected
                            ? 'bg-[#CCFBF1] border-2 border-[#0F766E]'
                            : 'bg-white border border-[#E5E7EB] hover:border-[#0F766E]/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[15px] font-semibold text-[#111827]">
                            {menu.name}
                          </span>
                          <span className="text-[15px] font-semibold text-[#0F766E] shrink-0 tabular-nums">
                            {formatCurrency(menu.price_per_pax)}/pax
                          </span>
                        </div>
                        {menu.description && (
                          <p className="text-[13px] text-[#6B7280] mt-1 line-clamp-2">
                            {menu.description}
                          </p>
                        )}
                        {(menu.min_guests || menu.max_guests) && (
                          <p className="text-[13px] text-[#9CA3AF] mt-1">
                            {menu.min_guests && `Mín. ${menu.min_guests}`}
                            {menu.min_guests && menu.max_guests && ' · '}
                            {menu.max_guests && `Máx. ${menu.max_guests} pax`}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Hidden real input for RHF */}
                <input type="hidden" {...register('menu_id')} />
                <FieldError message={errors.menu_id?.message} />
              </>
            )}
          </SectionCard>

          {/* Section 4 — Condiciones */}
          <SectionCard title="Condiciones del presupuesto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Válido hasta */}
              <div>
                <FieldLabel htmlFor="valid_until">Válido hasta *</FieldLabel>
                <input
                  id="valid_until"
                  type="date"
                  className={inputCls}
                  {...register('valid_until')}
                />
                <FieldError message={errors.valid_until?.message} />
              </div>

              {/* Fianza */}
              <div>
                <FieldLabel htmlFor="deposit_amount">
                  Fianza requerida (€)
                </FieldLabel>
                <input
                  id="deposit_amount"
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputCls}
                  placeholder="0,00"
                  {...register('deposit_amount')}
                />
                <FieldError message={errors.deposit_amount?.message} />
              </div>

              {/* Condiciones legales — full width */}
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="legal_terms">
                  Condiciones legales
                </FieldLabel>
                <textarea
                  id="legal_terms"
                  rows={5}
                  className={cn(inputCls, 'resize-none')}
                  placeholder="Ej: El presupuesto incluye servicio de montaje y desmontaje. La fianza no es reembolsable en caso de cancelación con menos de 15 días..."
                  {...register('legal_terms')}
                />
                <p className="text-[13px] text-[#9CA3AF] mt-1">
                  Este texto aparecerá en el PDF del presupuesto.
                </p>
              </div>

              {/* Notas internas — full width, visually differentiated */}
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="notes">Notas internas</FieldLabel>
                <textarea
                  id="notes"
                  rows={3}
                  className={cn(
                    'w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg px-3 py-2 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 resize-none transition-colors'
                  )}
                  placeholder="Notas solo visibles para ti, no aparecen en el PDF..."
                  {...register('notes')}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ═══ RIGHT COLUMN — Preview ══════════════════════════ */}
        <div className="sticky top-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="font-heading text-[15px] font-semibold text-[#111827] mb-4">
              Resumen del presupuesto
            </h2>

            {/* Client block */}
            {watched.client_name && watched.client_name.length >= 2 ? (
              <>
                <div>
                  <p className="text-[15px] font-semibold text-[#111827]">
                    {watched.client_name}
                  </p>
                  {watched.client_email && (
                    <p className="text-[13px] text-[#6B7280]">{watched.client_email}</p>
                  )}
                  {(watched.event_type || watched.event_date) && (
                    <p className="text-[13px] text-[#6B7280] mt-0.5">
                      {[
                        watched.event_type,
                        watched.event_date ? formatDateEs(watched.event_date) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div className="border-t border-[#E5E7EB] my-4" />
              </>
            ) : (
              <div className="mb-4">
                <p className="text-[13px] text-[#9CA3AF] italic">
                  Rellena los datos del cliente…
                </p>
              </div>
            )}

            {/* Menu block */}
            {selectedMenu ? (
              <>
                <div>
                  <p className="text-[15px] font-semibold text-[#111827]">
                    {selectedMenu.name}
                  </p>
                  <p className="text-[13px] text-[#6B7280] mt-0.5">
                    {guests} persona{guests !== 1 ? 's' : ''} ×{' '}
                    {formatCurrency(selectedMenu.price_per_pax)} / pax
                  </p>
                </div>
                <div className="border-t border-[#E5E7EB] my-4" />
              </>
            ) : (
              <div className="mb-4">
                <p className="text-[13px] text-[#9CA3AF] italic">
                  Selecciona un menú…
                </p>
              </div>
            )}

            {/* Economics table */}
            <table className="w-full text-[15px]">
              <tbody>
                <tr>
                  <td className="py-1 text-[#6B7280]">Subtotal</td>
                  <td className="py-1 text-right text-[#111827] tabular-nums">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-[#6B7280]">IVA (21%)</td>
                  <td className="py-1 text-right text-[#111827] tabular-nums">
                    {formatCurrency(taxAmount)}
                  </td>
                </tr>
                <tr className="border-t border-[#E5E7EB]">
                  <td className="pt-2 pb-1 font-medium text-[#111827]">Total</td>
                  <td className="pt-2 pb-1 text-right text-[17px] font-semibold text-[#111827] tabular-nums">
                    {formatCurrency(total)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-[#6B7280]">Fianza</td>
                  <td className="py-1 text-right text-[#0F766E] font-medium tabular-nums">
                    {formatCurrency(depositAmt)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Valid until */}
            {watched.valid_until && (
              <p className="flex items-center gap-1 text-[13px] text-[#9CA3AF] mt-3">
                <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                Válido hasta el {formatDateEs(watched.valid_until)}
              </p>
            )}

            <div className="border-t border-[#E5E7EB] mt-4 pt-4 space-y-2">
              {/* Guardar borrador */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onSubmit('draft')}
                className="w-full border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[15px] font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {submitting === 'draft' && (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />
                )}
                Guardar borrador
              </button>

              {/* Generar y enviar PDF */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onSubmit('send')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium px-4 py-2 text-[15px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {submitting === 'send' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                )}
                Generar y enviar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
