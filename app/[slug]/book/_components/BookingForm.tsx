'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createBooking } from '../actions'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type MenuProps = {
  id: string
  name: string
  description: string | null
  price_per_person: number
  min_guests?: number | null
  max_guests?: number | null
}

type BookingFormProps = {
  tenantId: string
  menus: MenuProps[]
  tenantName: string
}

const bookingSchema = z.object({
  menu_id: z.string().min(1, 'Selecciona un menú para continuar'),
  event_date: z.string().refine((date) => {
    return new Date(date) >= new Date(new Date().toISOString().split('T')[0])
  }, { message: 'La fecha no puede ser anterior a hoy' }),
  guests: z.coerce.number().min(1, 'Debe ser al menos 1 invitado'),
  client_name: z.string().min(2, 'Ingresa tu nombre completo'),
  client_email: z.string().email('Ingresa un email válido'),
  client_phone: z.string().optional(),
  notes: z.string().optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

const inputClass =
  'w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 transition-colors duration-150'

const labelClass =
  'text-xs font-semibold uppercase tracking-wide text-[#6B7280]'

export function BookingForm({ tenantId, menus, tenantName }: BookingFormProps) {
  const today = new Date().toISOString().split('T')[0]
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedData, setSubmittedData] = useState<BookingFormData | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      menu_id: '',
      guests: 1,
    }
  })

  const selectedMenuId = watch('menu_id')
  const guestsValue = watch('guests') || 0
  const selectedMenu = menus.find((m) => m.id === selectedMenuId)
  const estimatedTotal = selectedMenu ? guestsValue * selectedMenu.price_per_person : 0
  const outsideRange =
    selectedMenu &&
    ((selectedMenu.min_guests != null && guestsValue < selectedMenu.min_guests) ||
      (selectedMenu.max_guests != null && guestsValue > selectedMenu.max_guests))

  const onSubmit = (data: BookingFormData) => {
    startTransition(async () => {
      const result = await createBooking({ ...data, tenant_id: tenantId })

      if (result.error) {
        toast.error(result.error)
      } else {
        setSubmittedData(data)
        setIsSuccess(true)
      }
    })
  }

  if (isSuccess && submittedData) {
    const selectedMenu = menus.find(m => m.id === submittedData.menu_id)
    const total = selectedMenu ? submittedData.guests * selectedMenu.price_per_person : 0
    return (
      <div className="text-center flex flex-col items-center animate-in fade-in duration-500">
        <CheckCircle2 className="w-16 h-16 text-[#16A34A] mx-auto" strokeWidth={1.5} />
        <h2 className="font-heading text-2xl font-semibold text-[#111827] text-center mt-4">
          ¡Solicitud enviada!
        </h2>
        <p className="text-sm text-[#6B7280] text-center mt-2 max-w-sm mx-auto">
          Hemos recibido tu solicitud. El equipo de {tenantName} se pondrá en contacto contigo pronto.
        </p>
        <div className="bg-[#F8FAFC] rounded-xl p-5 mt-6 w-full text-left space-y-4">
          <div>
            <span className={`${labelClass} block text-[#9CA3AF]`}>Menú seleccionado</span>
            <span className="text-sm text-[#111827] mt-1 block">{selectedMenu?.name || '—'}</span>
          </div>
          <div>
            <span className={`${labelClass} block text-[#9CA3AF]`}>Fecha</span>
            <span className="text-sm text-[#111827] mt-1 block tabular-nums">{submittedData.event_date}</span>
          </div>
          <div>
            <span className={`${labelClass} block text-[#9CA3AF]`}>Personas</span>
            <span className="text-sm text-[#111827] mt-1 block tabular-nums">{submittedData.guests}</span>
          </div>
          <div>
            <span className={`${labelClass} block text-[#9CA3AF]`}>Estimación</span>
            <span className="text-sm text-[#111827] mt-1 block tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">

      <div className="space-y-4">
        <h3 className="font-heading text-base font-semibold text-[#111827] mb-4">
          1. Selecciona un menú
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {menus.length === 0 && (
            <p className="text-sm text-[#6B7280] col-span-2">
              No hay menús disponibles en este momento.
            </p>
          )}
          {menus.map((menu) => {
            const isSelected = selectedMenuId === menu.id
            return (
              <div
                key={menu.id}
                role="button"
                tabIndex={0}
                onClick={() => setValue('menu_id', menu.id, { shouldValidate: true })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setValue('menu_id', menu.id, { shouldValidate: true })
                  }
                }}
                className={`cursor-pointer rounded-xl p-4 transition-colors duration-150 active:scale-[0.99] ${
                  isSelected
                    ? 'bg-[#CCFBF1] border-2 border-[#0F766E]'
                    : 'bg-white border border-[#E5E7EB] hover:border-[#0F766E]/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h4 className="text-sm font-semibold text-[#111827]">{menu.name}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[#0F766E] font-mono font-semibold text-sm whitespace-nowrap tabular-nums">
                      {formatCurrency(menu.price_per_person)}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" strokeWidth={1.5} aria-hidden />
                    )}
                  </div>
                </div>
                {menu.description && (
                  <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{menu.description}</p>
                )}
              </div>
            )
          })}
        </div>
        {errors.menu_id && <p className="text-[#DC2626] text-sm">{errors.menu_id.message}</p>}
      </div>

      <div className="border-t border-[#E5E7EB] my-6" />

      <div className="space-y-4">
        <h3 className="font-heading text-base font-semibold text-[#111827] mb-4">
          2. Detalles del evento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="event_date" className={labelClass}>Fecha del evento</label>
            <input
              id="event_date"
              type="date"
              min={today}
              {...register('event_date')}
              className={inputClass}
            />
            {errors.event_date && <p className="text-[#DC2626] text-sm">{errors.event_date.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="guests" className={labelClass}>Número de personas</label>
            <input
              id="guests"
              type="number"
              min="1"
              {...register('guests')}
              className={inputClass}
            />
            {outsideRange && (
              <p className="text-xs text-[#D97706] mt-1">
                El número de personas está fuera del rango permitido para este menú.
              </p>
            )}
            {errors.guests && <p className="text-[#DC2626] text-sm">{errors.guests.message}</p>}
          </div>
        </div>
        <div className="bg-[#CCFBF1] border border-[#0F766E]/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#0F766E] font-medium">Estimación:</span>
          <span className="text-base font-semibold text-[#0F766E] tabular-nums">{formatCurrency(estimatedTotal)}</span>
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] my-6" />

      <div className="space-y-4">
        <h3 className="font-heading text-base font-semibold text-[#111827] mb-4">
          3. Tus datos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="client_name" className={labelClass}>Nombre completo</label>
            <input
              id="client_name"
              type="text"
              placeholder="Ej. María García"
              {...register('client_name')}
              className={inputClass}
            />
            {errors.client_name && <p className="text-[#DC2626] text-sm">{errors.client_name.message}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="client_email" className={labelClass}>Email</label>
            <input
              id="client_email"
              type="email"
              placeholder="maria@ejemplo.com"
              {...register('client_email')}
              className={inputClass}
            />
            {errors.client_email && <p className="text-[#DC2626] text-sm">{errors.client_email.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="client_phone" className={labelClass}>Teléfono (opcional)</label>
            <input
              id="client_phone"
              type="tel"
              placeholder="+34 600..."
              {...register('client_phone')}
              className={inputClass}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="notes" className={labelClass}>Notas adicionales (opcional)</label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Alergias, preferencias, indicaciones especiales..."
              {...register('notes')}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white rounded-lg py-3.5 text-base font-semibold font-heading transition-colors duration-150 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
              Enviando...
            </>
          ) : (
            <>
              Enviar solicitud de reserva
              <Send className="h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </button>
      </div>

    </form>
  )
}
