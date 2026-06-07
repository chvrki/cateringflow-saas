import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StockClient } from './stock-client'
import { Pagination } from '../_components/Pagination'

const PAGE_SIZE = 25

export type StockIngredient = {
  id: string
  name: string
  unit: string
  stock_quantity: number
  stock_min: number
  stock_location: string | null
}

export type UpcomingBooking = {
  id: string
  client_name: string
  event_date: string | null
}

interface PageProps {
  searchParams?: { page?: string; filter?: string }
}

export default async function StockPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page = Math.max(1, Number(searchParams?.page ?? 1))
  const alertsOnly = searchParams?.filter === 'alerts'
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('ingredients')
    .select('id, name, unit, stock_quantity, stock_min, stock_location', { count: 'exact' })
    .order('name', { ascending: true })

  if (alertsOnly) {
    query = (query as any).eq('stock_is_low', true).gt('stock_min', 0)
  }

  const today = new Date().toISOString().split('T')[0]

  const [pageRes, bookingsRes] = await Promise.all([
    query.range(from, to),
    supabase
      .from('bookings')
      .select('id, client_name, event_date')
      .in('status', ['pending', 'confirmed'])
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(50),
  ])

  const ingredients = (pageRes.data ?? []) as StockIngredient[]
  const count = pageRes.count
  const upcomingBookings = (bookingsRes.data ?? []) as UpcomingBooking[]
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-10">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
            Stock
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            Inventario de ingredientes y alertas de stock mínimo.
          </p>
        </div>

        <StockClient ingredients={ingredients} alertsOnly={alertsOnly} bookings={upcomingBookings} />

        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/dashboard/stock"
            extraParams={alertsOnly ? { filter: 'alerts' } : undefined}
          />
        </div>
      </div>
    </div>
  )
}
