'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { type AllergenId } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { AllergenPicker } from '@/components/ui/allergen-picker'

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
  'bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]'
const textareaCls = inputCls + ' min-h-[5rem]'

export default function NewMenuPage() {
  const router = useRouter()
  const supabase = createClient()
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

  const handleImageChange = (file: File | null) => {
    form.setValue('cover_image', file)
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImagePreview(null)
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
        description: 'Vuelve a iniciar sesión para crear menús.',
      })
      router.push('/login')
      return
    }

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

    // 1) Crear menú sin portada primero
    const { data: menu, error: insertError } = await supabase
      .from('menus')
      .insert({
        tenant_id: tenantId,
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
      .select()
      .single()

    if (insertError || !menu) {
      toast.error('No se pudo crear el menú', {
        description: insertError?.message,
      })
      setIsSubmitting(false)
      return
    }

    let coverUrl: string | null = null

    // 2) Si hay imagen, subirla a Supabase Storage y actualizar cover_url
    if (values.cover_image instanceof File) {
      const file = values.cover_image
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `${tenantId}/menus/${menu.id}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('menu-photos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        toast.error('Menú creado, pero la imagen falló', {
          description: uploadError.message,
        })
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from('menu-photos').getPublicUrl(path)
        coverUrl = publicUrl

        await supabase
          .from('menus')
          .update({ cover_url: coverUrl })
          .eq('id', menu.id)
      }
    }

    toast.success('Menú creado', {
      description: 'Ahora añade los platos de este menú.',
    })
    router.push(`/dashboard/menus/${menu.id}/items`)
  }

  const allergensValue = form.watch('allergens') as AllergenId[]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/menus"
          className="group inline-flex items-center gap-1.5 text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors duration-150"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" strokeWidth={1.5} />
          Volver
        </Link>
      </div>
      <div>
        <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">Nuevo menú</h1>
        <p className="text-[#6B7280] text-[14px] mt-1.5 leading-relaxed">
          Configura el menú y luego añade los platos.
        </p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-5 font-heading">
          Información del menú
        </h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Nombre del menú *</FormLabel>
                    <FormControl>
                      <Input
                        className={inputCls}
                        placeholder="Menú de boda clásico"
                        {...field}
                      />
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
                      <Textarea
                        className={textareaCls}
                        placeholder="Describe el menú, sus características, estilo..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelCls}>Precio por persona (€) *</FormLabel>
                    <FormControl>
                      <Input
                        className={inputCls}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="45.00"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>Mínimo de personas</FormLabel>
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
                                : Number(e.target.value)
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
                      <FormLabel className={labelCls}>Máximo de personas</FormLabel>
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
                                : Number(e.target.value)
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
                      <AllergenPicker
                        value={allergensValue}
                        onChange={(value) =>
                          form.setValue('allergens', value, {
                            shouldDirty: true,
                          })
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cover_image"
                render={() => (
                  <FormItem>
                    <FormLabel className={labelCls}>Imagen de portada</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          className={inputCls}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageChange(
                              e.target.files?.[0] ?? null
                            )
                          }
                        />
                        {imagePreview && (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-[#F8FAFC]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imagePreview}
                                alt="Preview portada"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-[13px] text-[#6B7280] flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" strokeWidth={1.5} />
                              Vista previa de la imagen seleccionada
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                      <div>
                        <p className="text-[14px] font-medium text-[#111827]">
                          Menú activo
                        </p>
                        <p className="text-[13px] text-[#6B7280] mt-0.5">
                          Los clientes podrán ver y reservar este menú.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-[#0F766E]"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="group w-full rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium transition-colors duration-150 active:scale-[0.97] disabled:active:scale-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.5} />
                    Guardando…
                  </>
                ) : (
                  <>
                    Crear menú y añadir platos
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={1.5} />
                  </>
                )}
              </Button>
            </form>
          </Form>
      </div>
    </div>
  )
}

