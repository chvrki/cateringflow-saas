'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { type AllergenId } from '@/lib/utils'
import { MenuCost } from './menu-cost'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { AllergenPicker } from '@/components/ui/allergen-picker'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const menuSchema = z
  .object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    description: z.string().max(2000).optional().or(z.literal('')),
    price_per_person: z
      .number({ invalid_type_error: 'Precio obligatorio' })
      .positive('El precio debe ser mayor que 0'),
    min_guests: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .min(1, 'Debe ser al menos 1')
      .optional()
      .or(z.nan()),
    max_guests: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .min(1, 'Debe ser al menos 1')
      .optional()
      .or(z.nan()),
    active: z.boolean().default(true),
    allergens: z.array(z.string()).default([]),
    cover_image: z
      .instanceof(File)
      .optional()
      .or(z.null())
      .nullable(),
  })
  .refine(
    (data) => {
      if (
        data.min_guests &&
        !Number.isNaN(data.min_guests) &&
        data.max_guests &&
        !Number.isNaN(data.max_guests)
      ) {
        return data.min_guests <= data.max_guests
      }
      return true
    },
    {
      message: 'El mínimo de personas no puede ser mayor que el máximo',
      path: ['max_guests'],
    }
  )

type MenuFormValues = z.infer<typeof menuSchema>

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]'
const inputCls =
  'bg-white border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] h-10 placeholder:text-[#9CA3AF]'
const textareaCls =
  'bg-white border border-[#E5E7EB] text-[#111827] rounded-lg focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 text-[15px] min-h-[5rem] placeholder:text-[#9CA3AF]'

export default function EditMenuPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: '',
      description: '',
      price_per_person: 0,
      min_guests: undefined,
      max_guests: undefined,
      active: true,
      allergens: [],
      cover_image: null,
    },
  })

  const watchName = form.watch('name')
  const watchActive = form.watch('active')

  useEffect(() => {
    const loadMenu = async () => {
      setIsLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      const { data: menu, error } = await supabase
        .from('menus')
        .select('*')
        .eq('id', params.id)
        .maybeSingle()

      if (error || !menu) {
        toast.error('No se pudo cargar el menú', {
          description: error?.message,
        })
        router.push('/dashboard/menus')
        return
      }

      form.reset({
        name: menu.name ?? '',
        description: menu.description ?? '',
        price_per_person: menu.price_per_person ?? 0,
        min_guests: menu.min_guests ?? undefined,
        max_guests: menu.max_guests ?? undefined,
        active: menu.active ?? true,
        allergens: ((menu as { allergens?: string[] }).allergens ?? []) as string[],
        cover_image: null,
      })

      if (menu.cover_url) {
        setImagePreview(menu.cover_url)
      }
      setIsLoading(false)
    }

    void loadMenu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const handleImageChange = (file: File | null) => {
    form.setValue('cover_image', file)
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    }
  }

  const onSubmit = async (values: MenuFormValues) => {
    setIsSubmitting(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      toast.error('Sesión no válida', {
        description: 'Vuelve a iniciar sesión.',
      })
      setIsSubmitting(false)
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('menus')
      .update({
        name: values.name,
        description: values.description || null,
        price_per_person: values.price_per_person,
        min_guests:
          values.min_guests && !Number.isNaN(values.min_guests)
            ? values.min_guests
            : null,
        max_guests:
          values.max_guests && !Number.isNaN(values.max_guests)
            ? values.max_guests
            : null,
        active: values.active,
      })
      .eq('id', params.id)

    if (updateError) {
      toast.error('No se pudo actualizar el menú', {
        description: updateError.message,
      })
      setIsSubmitting(false)
      return
    }

    if (values.cover_image instanceof File) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile?.tenant_id) {
        toast.error('No se pudo obtener el tenant', {
          description: profileError?.message,
        })
        setIsSubmitting(false)
        return
      }

      const tenantId = profile.tenant_id as string
      const file = values.cover_image
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `${tenantId}/menus/${params.id}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('menu-photos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        toast.error('Menú actualizado, pero la imagen falló', {
          description: uploadError.message,
        })
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from('menu-photos').getPublicUrl(path)

        await supabase
          .from('menus')
          .update({ cover_url: publicUrl })
          .eq('id', params.id)
      }
    }

    toast.success('Menú actualizado')
    router.push('/dashboard/menus')
  }

  const allergensValue = form.watch('allergens') as AllergenId[]

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Link
            href="/dashboard/menus"
            className="inline-flex items-center text-[15px] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Menús
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 min-w-0">
              <nav className="text-[15px] text-[#6B7280] flex flex-wrap items-center gap-1">
                <Link
                  href="/dashboard/menus"
                  className="text-[#0F766E] hover:text-[#115E59] font-medium transition-colors"
                >
                  Menús
                </Link>
                <span className="text-[#9CA3AF]" aria-hidden>
                  ›
                </span>
                <span className="text-[#111827] truncate max-w-[min(100%,280px)]">
                  {watchName || 'Menú'}
                </span>
              </nav>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
                  {watchName || 'Menú'}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-none',
                    watchActive
                      ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20'
                      : 'bg-[#FEF3C7] text-[#D97706] border-[#D97706]/20',
                  )}
                >
                  {watchActive ? 'Publicado' : 'Borrador'}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/dashboard/menus"
                className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[15px] font-medium text-[#111827] hover:bg-[#F8FAFC] transition-colors"
              >
                Cancelar
              </Link>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                onClick={() =>
                  form.setValue('active', !form.getValues('active'), {
                    shouldDirty: true,
                  })
                }
              >
                {watchActive ? 'Marcar borrador' : 'Publicar menú'}
              </Button>
              <Button
                type="submit"
                form="edit-menu-form"
                disabled={isSubmitting}
                className="rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando…
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3 space-y-6 lg:col-start-1">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-4 font-heading">
                  Información general
                </h2>
                <Form {...form}>
                  <form
                    id="edit-menu-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                    noValidate
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelCls}>Nombre del menú</FormLabel>
                          <FormControl>
                            <Input className={inputCls} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelCls}>Descripción</FormLabel>
                          <FormControl>
                            <Textarea rows={3} className={textareaCls} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_per_person"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelCls}>
                              Precio por pax (€)
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputCls}
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ''
                                      ? undefined
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormItem>
                        <FormLabel className={labelCls}>Tipo de precio</FormLabel>
                        <div
                          className={cn(
                            inputCls,
                            'flex h-10 items-center px-3 text-[15px] text-[#6B7280] bg-[#F8FAFC]',
                          )}
                        >
                          Por pax
                        </div>
                        <p className="text-[13px] text-[#9CA3AF] mt-1">
                          Solo disponible por persona en esta versión.
                        </p>
                      </FormItem>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="min_guests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelCls}>
                              Mínimo de personas
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ''
                                      ? undefined
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="max_guests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelCls}>
                              Máximo de personas
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputCls}
                                type="number"
                                min="1"
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ''
                                      ? undefined
                                      : Number(e.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="allergens"
                      render={() => (
                        <FormItem>
                          <FormLabel className={labelCls}>Alérgenos del menú</FormLabel>
                          <FormControl>
                            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]/50 p-3">
                              <AllergenPicker
                                value={allergensValue}
                                onChange={(value) =>
                                  form.setValue('allergens', value, {
                                    shouldDirty: true,
                                  })
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-t border-[#E5E7EB] pt-5 space-y-3">
                      <h3 className={labelCls}>Imagen de portada</h3>
                      <FormField
                        control={form.control}
                        name="cover_image"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <div className="space-y-3">
                                {imagePreview ? (
                                  <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border border-[#E5E7EB] bg-[#F8FAFC]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={imagePreview}
                                      alt="Portada actual"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full max-w-xs aspect-video rounded-lg border border-dashed border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-center">
                                    <ImageIcon className="h-10 w-10 text-[#9CA3AF]" />
                                  </div>
                                )}
                                <label className="inline-flex cursor-pointer">
                                  <span className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[15px] font-medium text-[#111827] hover:bg-[#F8FAFC] transition-colors">
                                    Cambiar imagen
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleImageChange(
                                        e.target.files?.[0] ?? null,
                                      )
                                    }
                                  />
                                </label>
                                <p className="text-[13px] text-[#9CA3AF] truncate max-w-xs">
                                  {(form.watch('cover_image') as File | null)?.name ||
                                    'Ningún archivo nuevo'}
                                </p>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] font-heading">
                    Platos
                  </h2>
                  <Link
                    href={`/dashboard/menus/${params.id}/items`}
                    className="inline-flex items-center justify-center rounded-lg bg-[#0F766E] text-white text-[13px] font-medium px-3 py-1.5 hover:bg-[#115E59] transition-colors w-fit"
                  >
                    + Añadir plato
                  </Link>
                </div>
                <p className="text-[15px] text-[#9CA3AF] text-center py-10">
                  Añade el primer plato
                </p>
                <p className="text-[13px] text-[#6B7280] text-center -mt-6 mb-2">
                  Los entrantes, principales y postres se gestionan en la vista de
                  platos.
                </p>
                <div className="flex justify-center">
                  <Link
                    href={`/dashboard/menus/${params.id}/items`}
                    className="text-[15px] font-medium text-[#0F766E] hover:text-[#115E59] transition-colors"
                  >
                    Abrir editor de platos →
                  </Link>
                </div>
              </div>

              <MenuCost
                menuId={params.id}
                pricePerPerson={form.watch('price_per_person') ?? 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
