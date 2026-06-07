'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  UtensilsCrossed,
  Loader2,
  Edit2,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import type { Menu, MenuItem } from '@/types/database'
import { ALLERGENS, CATEGORY_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MenuItemsManagerProps {
  menu: Menu
  initialItems: MenuItem[]
  tenantId: string
}

const categoryOrder: MenuItem['category'][] = [
  'entrante',
  'principal',
  'postre',
  'bebida',
  'extra',
]

const labelCls = 'text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[14px] h-10 placeholder:text-[#9CA3AF]'
const textareaCls =
  'bg-white border border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[14px] min-h-[4.5rem] placeholder:text-[#9CA3AF]'

export function MenuItemsManager({
  menu,
  initialItems,
  tenantId,
}: MenuItemsManagerProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'principal' as MenuItem['category'],
    allergens: [] as string[],
    photo_url: '',
  })

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items],
  )

  const toggleAllergen = (code: string) => {
    setForm((f) => ({
      ...f,
      allergens: f.allergens.includes(code)
        ? f.allergens.filter((a) => a !== code)
        : [...f.allergens, code],
    }))
  }

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      category: 'principal',
      allergens: [],
      photo_url: '',
    })
    setEditingItem(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    if (editingItem) {
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          name: form.name,
          description: form.description || null,
          category: form.category,
          allergens: form.allergens,
          photo_url: form.photo_url || null,
        })
        .eq('id', editingItem.id)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)))
        setOpen(false)
        resetForm()
        toast({ title: 'Plato actualizado', description: data.name })
      }
    } else {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          menu_id: menu.id,
          tenant_id: tenantId,
          name: form.name,
          description: form.description || null,
          category: form.category,
          allergens: form.allergens,
          photo_url: form.photo_url || null,
          sort_order: items.length,
        })
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setItems((prev) => [...prev, data])
        resetForm()
        setOpen(false)
        toast({ title: 'Plato añadido', description: data.name })
      }
    }
    setSaving(false)
  }

  const handleDelete = async (itemId: string) => {
    setDeleting(itemId)
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast({ title: 'Plato eliminado' })
    }
    setDeleting(null)
  }

  const openNew = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      category: item.category,
      allergens: item.allergens,
      photo_url: item.photo_url || '',
    })
    setOpen(true)
  }

  const sheetOnOpenChange = (v: boolean) => {
    if (!v) resetForm()
    setOpen(v)
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen w-full p-8 text-[#111827]">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href={`/dashboard/menus/${menu.id}`}
          className="inline-flex items-center text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al menú
        </Link>

        <nav className="text-[14px] text-[#6B7280] flex flex-wrap items-center gap-1">
          <Link
            href="/dashboard/menus"
            className="text-[#0F766E] hover:text-[#115E59] font-medium"
          >
            Menús
          </Link>
          <span className="text-[#9CA3AF]" aria-hidden>
            ›
          </span>
          <Link
            href={`/dashboard/menus/${menu.id}`}
            className="text-[#0F766E] hover:text-[#115E59] font-medium truncate max-w-[200px]"
          >
            {menu.name}
          </Link>
          <span className="text-[#9CA3AF]" aria-hidden>
            ›
          </span>
          <span className="text-[#111827]">Platos</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
              Platos del menú
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1">
              {menu.name}
            </p>
          </div>
          <Button
            type="button"
            onClick={openNew}
            className="rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] font-medium gap-2 w-fit"
          >
            <Plus className="h-4 w-4" />
            Añadir plato
          </Button>
        </div>

        <Sheet open={open} onOpenChange={sheetOnOpenChange}>
          <SheetContent
            side="right"
            className="w-full max-w-[min(100vw,420px)] sm:max-w-[420px] border-l border-[#E5E7EB] bg-white p-0 flex flex-col gap-0"
          >
            <SheetHeader className="p-6 pb-4 border-b border-[#E5E7EB] pr-14">
              <SheetTitle className="font-heading text-[17px] font-semibold text-[#111827] text-left">
                {editingItem ? 'Editar plato' : 'Nuevo plato'}
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label className={labelCls}>Nombre</Label>
                <Input
                  className={inputCls}
                  placeholder="Ensalada de burrata"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Descripción</Label>
                <Textarea
                  className={textareaCls}
                  placeholder="Ingredientes y preparación…"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Categoría</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as MenuItem['category'] })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      'w-full rounded-lg border-[#E5E7EB] bg-white text-[#111827] h-10',
                      'focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]',
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    {categoryOrder.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Alérgenos</Label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAllergen(a.id)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md border transition-colors',
                        form.allergens.includes(a.id)
                          ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#DC2626]'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]',
                      )}
                    >
                      {a.emoji} {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="p-4 border-t border-[#E5E7EB] flex flex-row gap-3 sm:justify-end bg-[#F8FAFC]">
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando…
                  </>
                ) : (
                  'Guardar plato'
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {items.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#E5E7EB] rounded-xl">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-[#9CA3AF] mb-4" />
            <p className="text-sm text-[#6B7280] font-medium">
              Añade el primer plato
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="divide-y divide-[#E5E7EB]">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  <GripVertical
                    className="h-4 w-4 text-[#9CA3AF] shrink-0 cursor-grab"
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[#111827]">
                        {item.name}
                      </p>
                      <span className="bg-[#F3F4F6] text-[#6B7280] text-xs rounded-md px-2 py-0.5 font-medium">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[#111827] text-right tabular-nums shrink-0 min-w-[3.5rem]">
                    {(item as { price?: number }).price != null
                      ? `${(item as { price?: number }).price} €`
                      : ''}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#0F766E] hover:bg-[#CCFBF1] transition-colors"
                      aria-label="Editar plato"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
                      aria-label="Eliminar plato"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
