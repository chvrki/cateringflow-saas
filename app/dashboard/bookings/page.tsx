import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import type { BookingWithMenu } from '@/types/database'
import { ClientBookings } from './client-bookings'
import { Pagination } from '../_components/Pagination'

const PAGE_SIZE = 20

const statusMap: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',   cls: 'bg-[#FEF3C7] text-[#D97706]' },
  confirmed: { label: 'Confirmada',  cls: 'bg-[#DCFCE7] text-[#16A34A]' },
  cancelled: { label: 'Cancelada',   cls: 'bg-[#FEE2E2] text-[#DC2626]' },
  paid_full: { label: 'Completada',  cls: 'bg-[#DCFCE7] text-[#16A34A]' },
}

interface PageProps {
  searchParams?: { page?: string }
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page = Math.max(1, Number(searchParams?.page ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const [pageRes, totalRes, pendingRes, confirmedRes, revenueRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, client_name, client_email, event_date, guests, total_amount, created_at, menus(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('bookings').select('total_amount').neq('status', 'cancelled'),
  ])

  const bookings   = (pageRes.data ?? []) as unknown as BookingWithMenu[]
  const totalCount = totalRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const stats = {
    total:     totalCount,
    pending:   pendingRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    revenue:   (revenueRes.data ?? []).reduce((s, b) => s + ((b as any).total_amount ?? 0), 0),
  }

  const statCards = [
    { label: 'Volumen global',        value: String(stats.total) },
    { label: 'Solicitadas',           value: String(stats.pending) },
    { label: 'Aprobadas',             value: String(stats.confirmed) },
    { label: 'Facturación proyectada', value: formatCurrency(stats.revenue) },
  ]

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">

        <div className="mb-10">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
            Reservas y solicitudes
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            Revisa el estado comercial general de tus eventos.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="bg-white border border-[#E5E7EB] rounded-xl p-5 transition-shadow duration-200 hover:shadow-[0_2px_12px_rgba(15,23,42,0.05)]"
            >
              <p className="text-[11px] uppercase tracking-wide text-[#6B7280] font-medium mb-3">
                {s.label}
              </p>
              <p className="text-[26px] font-semibold text-[#111827] tabular-nums leading-none">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <ClientBookings bookings={bookings} statusMap={statusMap} />

        <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/bookings" />
      </div>
    </div>
  )
}
