import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, UtensilsCrossed, Edit2, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type Menu = Database['public']['Tables']['menus']['Row'] & { menu_items: { count: number }[] }

export default async function MenusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS scopes all queries to the current user's tenant automatically
  const { data: menusRes } = await supabase
    .from('menus')
    .select('*, menu_items(count)')
    .order('created_at', { ascending: false })
  const menus = (menusRes ?? []) as unknown as Menu[]

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
              Constructor de menús
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-1">
              Gestiona los catálogos y precios visibles en tu plataforma.
            </p>
          </div>
          <Link
            href="/dashboard/menus/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo menú
          </Link>
        </div>

        {!menus || menus.length === 0 ? (
          <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <UtensilsCrossed className="w-12 h-12 text-[#9CA3AF] mb-4" />
            <h3 className="font-heading font-semibold text-[#111827] text-[17px]">
              Sin menús todavía
            </h3>
            <p className="text-[15px] text-[#6B7280] mt-2 mb-6 max-w-sm mx-auto">
              Crea tu primer menú de catering para empezar a recibir reservas.
            </p>
            <Link
              href="/dashboard/menus/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-[15px] font-medium text-white hover:bg-[#115E59] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crear primer menú
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => {
              const count = (menu as any).menu_items?.[0]?.count ?? 0
              const capLine =
                menu.min_guests && menu.max_guests
                  ? `${count} platos · ${menu.min_guests}–${menu.max_guests} pax min/max`
                  : `${count} platos · Cantidades libres`

              return (
                <div
                  key={menu.id}
                  className="overflow-hidden bg-white border border-[#E5E7EB] rounded-xl hover:border-[#0F766E]/30 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col"
                >
                  <div className="relative h-44 w-full bg-[#F8FAFC] border-b border-[#E5E7EB]">
                    {menu.cover_url ? (
                      <Image
                        src={menu.cover_url}
                        alt={menu.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UtensilsCrossed className="w-10 h-10 text-[#9CA3AF]" />
                      </div>
                    )}
                    <span
                      className={`absolute top-0 right-0 m-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        menu.active
                          ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/20'
                          : 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20'
                      }`}
                    >
                      {menu.active ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-heading text-[17px] font-semibold text-[#111827] leading-snug">
                      {menu.name}
                    </h3>
                    {menu.description ? (
                      <p className="text-[15px] text-[#6B7280] mt-0.5 line-clamp-1">
                        {menu.description}
                      </p>
                    ) : (
                      <p className="text-[15px] text-[#9CA3AF] mt-0.5 line-clamp-1 italic">
                        Sin descripción
                      </p>
                    )}

                    <div className="border-t border-[#E5E7EB] my-4" />

                    <div className="flex items-end justify-between gap-3 mt-auto">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                          Por pax
                        </p>
                        <p className="text-[20px] font-semibold text-[#111827] mt-0.5 tabular-nums">
                          {formatCurrency(menu.price_per_person)}
                        </p>
                      </div>
                      <p className="text-[13px] text-[#9CA3AF] text-right max-w-[55%] leading-relaxed">
                        {capLine}
                      </p>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <Link
                        href={`/dashboard/menus/${menu.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[15px] text-[#111827] hover:bg-[#F8FAFC] transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Ajustes
                      </Link>
                      <Link
                        href={`/dashboard/menus/${menu.id}/items`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[15px] text-[#111827] hover:bg-[#F8FAFC] transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Platos
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
