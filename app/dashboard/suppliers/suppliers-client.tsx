'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Truck } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { createSupplier, updateSupplier, deleteSupplier } from './actions'
import type { SupplierRow } from './page'

const schema = z.object({
  name:  z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] h-10 placeholder:text-[#9CA3AF]'

interface SuppliersClientProps {
  suppliers: SupplierRow[]
}

export function SuppliersClient({ suppliers }: SuppliersClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SupplierRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', notes: '' },
  })

  function openCreate() {
    setEditTarget(null)
    form.reset({ name: '', email: '', phone: '', notes: '' })
    setSheetOpen(true)
  }

  function openEdit(s: SupplierRow) {
    setEditTarget(s)
    form.reset({
      name:  s.name,
      email: s.email ?? '',
      phone: s.phone ?? '',
      notes: s.notes ?? '',
    })
    setSheetOpen(true)
  }

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        name:  values.name,
        email: values.email  || null,
        phone: values.phone  || null,
        notes: values.notes  || null,
      }
      const res = editTarget
        ? await updateSupplier(editTarget.id, payload)
        : await createSupplier(payload)

      if (res.error) {
        toast.error(editTarget ? 'No se pudo actualizar' : 'No se pudo crear', {
          description: res.error,
        })
        return
      }
      toast.success(editTarget ? 'Proveedor actualizado' : 'Proveedor creado')
      setSheetOpen(false)
      router.refresh()
    })
  }

  function handleDelete(s: SupplierRow) {
    if (!confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(s.id)
    startTransition(async () => {
      const res = await deleteSupplier(s.id)
      setDeletingId(null)
      if (res.error) {
        toast.error('No se pudo eliminar', { description: res.error })
        return
      }
      toast.success('Proveedor eliminado')
      router.refresh()
    })
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[13px] text-[#9CA3AF]">
          {suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''}
        </span>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </button>
      </div>

      {/* Empty state */}
      {suppliers.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-16 text-center flex flex-col items-center">
          <Truck className="w-12 h-12 text-[#9CA3AF] mb-4" />
          <h3 className="font-heading font-semibold text-[#111827] text-lg">Sin proveedores todavía</h3>
          <p className="text-[15px] text-[#6B7280] mt-2 mb-6 max-w-sm mx-auto">
            Añade proveedores para asociarlos a pedidos de compra.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir primer proveedor
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Nombre</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Email</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Teléfono</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium">Notas</th>
                <th className="px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors last:border-0"
                >
                  <td className="px-5 py-3.5 font-medium text-[#111827]">{s.name}</td>
                  <td className="px-5 py-3.5 text-[#6B7280]">
                    {s.email
                      ? <a href={`mailto:${s.email}`} className="hover:text-[#0F766E] transition-colors">{s.email}</a>
                      : <span className="text-[#9CA3AF]">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#6B7280]">
                    {s.phone ?? <span className="text-[#9CA3AF]">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#9CA3AF] max-w-xs truncate" title={s.notes ?? ''}>
                    {s.notes || <span className="text-[#9CA3AF]">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#0F766E] hover:bg-[#CCFBF1] transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors disabled:opacity-40"
                        title="Eliminar"
                      >
                        {deletingId === s.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setSheetOpen(false)}>
        <SheetContent
          side="right"
          className="w-full max-w-[min(100vw,480px)] sm:max-w-[480px] border-l border-[#E5E7EB] bg-white p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="p-6 border-b border-[#E5E7EB]">
            <SheetTitle className="font-heading text-[17px] font-semibold text-[#111827] text-left">
              {editTarget ? 'Editar proveedor' : 'Nuevo proveedor'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form id="supplier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Nombre *</FormLabel>
                      <FormControl>
                        <Input className={inputCls} placeholder="Distribuciones García S.L." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Email</FormLabel>
                      <FormControl>
                        <Input className={inputCls} type="email" placeholder="pedidos@proveedor.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Teléfono</FormLabel>
                      <FormControl>
                        <Input className={inputCls} type="tel" placeholder="+34 600 000 000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Condiciones de pago, horario de entrega..."
                          className={cn(
                            'resize-none bg-white border-[#E5E7EB] text-[#111827] rounded-lg text-[15px] placeholder:text-[#9CA3AF]',
                            'focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20',
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
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
              type="submit"
              form="supplier-form"
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editTarget ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
