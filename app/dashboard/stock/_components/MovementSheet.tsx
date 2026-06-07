'use client'

import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { registerMovement } from '../actions'
import type { StockIngredient, UpcomingBooking } from '../page'

const REASON_OPTS = {
  entrada: [
    { value: 'compra',     label: 'Compra' },
    { value: 'devolucion', label: 'Devolución' },
    { value: 'otro',       label: 'Otro' },
  ],
  salida: [
    { value: 'consumo_evento', label: 'Consumo evento' },
    { value: 'merma',          label: 'Merma' },
    { value: 'otro',           label: 'Otro' },
  ],
  ajuste: [
    { value: 'ajuste_inventario', label: 'Ajuste de inventario' },
  ],
} as const

const TYPE_LABELS = {
  entrada: 'Entrada',
  salida:  'Salida',
  ajuste:  'Ajuste',
} as const

const schema = z.object({
  type:     z.enum(['entrada', 'salida', 'ajuste']),
  quantity: z.coerce
    .number({ invalid_type_error: 'Cantidad obligatoria' })
    .positive('Debe ser mayor que 0'),
  reason:   z.string().min(1, 'Selecciona un motivo'),
  event_id: z.string().optional(),
  notes:    z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5 block'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] py-2.5 placeholder:text-[#9CA3AF]'

interface MovementSheetProps {
  ingredient:  StockIngredient | null
  defaultMode: 'movement' | 'adjust'
  bookings:    UpcomingBooking[]
  onClose:     () => void
}

export function MovementSheet({
  ingredient,
  defaultMode,
  bookings,
  onClose,
}: MovementSheetProps) {
  const [isPending, startTransition] = useTransition()

  const isAdjustMode = defaultMode === 'adjust'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:     isAdjustMode ? 'ajuste' : 'entrada',
      quantity: undefined,
      reason:   isAdjustMode ? 'ajuste_inventario' : '',
      event_id: '',
      notes:    '',
    },
  })

  useEffect(() => {
    if (ingredient) {
      form.reset({
        type:     isAdjustMode ? 'ajuste' : 'entrada',
        quantity: undefined,
        reason:   isAdjustMode ? 'ajuste_inventario' : '',
        event_id: '',
        notes:    '',
      })
    }
  }, [ingredient, isAdjustMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType    = form.watch('type')
  const selectedReason  = form.watch('reason')
  const showEventPicker = selectedReason === 'consumo_evento'
  const reasonOptions   = REASON_OPTS[selectedType] ?? []

  function handleTypeChange(val: string) {
    form.setValue('type', val as FormValues['type'])
    form.setValue('reason', val === 'ajuste' ? 'ajuste_inventario' : '')
    form.setValue('event_id', '')
    form.clearErrors('reason')
  }

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const res = await registerMovement(
        ingredient!.id,
        values.type,
        values.quantity,
        values.reason,
        values.notes || undefined,
        values.event_id || undefined,
      )
      if (res.error) {
        toast.error('Error al registrar', { description: res.error })
      } else {
        const label = TYPE_LABELS[values.type]
        toast.success(`${label} registrada correctamente`)
        onClose()
      }
    })
  }

  const currentStock = ingredient
    ? Number(ingredient.stock_quantity).toLocaleString('es-ES', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })
    : ''

  return (
    <Sheet open={!!ingredient} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="w-[480px] sm:w-[480px] sm:max-w-[480px] flex flex-col overflow-y-auto border-l border-[#E5E7EB]">
        <SheetHeader className="pb-4 border-b border-[#E5E7EB]">
          <SheetTitle className="text-[#111827] font-heading text-[17px]">
            {isAdjustMode ? 'Ajuste de inventario' : 'Registrar movimiento'}
          </SheetTitle>
          {ingredient && (
            <div className="mt-1">
              <p className="text-[15px] font-medium text-[#111827]">{ingredient.name}</p>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">
                Stock actual:{' '}
                <span className="font-mono font-medium text-[#6B7280]">
                  {currentStock} {ingredient.unit}
                </span>
              </p>
            </div>
          )}
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-y-auto"
          >
            <div className="flex-1 space-y-5 p-6">

              {/* Type selector — hidden in adjust mode */}
              {!isAdjustMode && (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Tipo de movimiento</FormLabel>
                      <div className="flex gap-2 mt-1">
                        {(['entrada', 'salida', 'ajuste'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleTypeChange(t)}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-[15px] font-medium border transition-colors duration-150',
                              field.value === t
                                ? 'bg-[#0F766E] border-[#0F766E] text-white'
                                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]'
                            )}
                          >
                            {TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>
                      {isAdjustMode ? 'Nueva cantidad' : 'Cantidad'}
                      <span className="ml-1 normal-case font-normal text-[#9CA3AF]">
                        ({ingredient?.unit})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder={isAdjustMode ? 'Cantidad exacta en inventario' : '0.000'}
                        className={cn(inputCls, 'font-mono')}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reason */}
              {!isAdjustMode && (
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Motivo</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val)
                          if (val !== 'consumo_evento') form.setValue('event_id', '')
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className={cn(inputCls, 'w-full')}>
                            <SelectValue placeholder="Selecciona un motivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reasonOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Event picker */}
              {showEventPicker && (
                <FormField
                  control={form.control}
                  name="event_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Reserva vinculada</FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={cn(inputCls, 'w-full')}>
                            <SelectValue placeholder="Seleccionar reserva (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin reserva específica</SelectItem>
                          {bookings.length === 0 ? (
                            <div className="px-3 py-2 text-[13px] text-[#9CA3AF]">
                              No hay reservas próximas
                            </div>
                          ) : (
                            bookings.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.client_name}
                                {b.event_date
                                  ? ` — ${new Date(b.event_date).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}`
                                  : ''}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>
                      Notas <span className="normal-case font-normal text-[#9CA3AF]">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones adicionales..."
                        rows={3}
                        className={cn(
                          'resize-none bg-white border-[#E5E7EB] text-[#111827] rounded-lg',
                          'focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20',
                          'text-[15px] placeholder:text-[#9CA3AF]',
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer */}
            <SheetFooter className="bg-white border-t border-[#E5E7EB] pt-5 mt-1 pb-2 gap-2 flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[15px] font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isAdjustMode ? 'Guardar ajuste' : 'Registrar'}
              </button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
