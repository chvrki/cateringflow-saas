import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ClientQuotes } from './client-quotes'
import { Pagination } from '../_components/Pagination'

export const metadata = {
  title: 'Presupuestos · Caterix',
  description: 'Gestiona y envia propuestas economicas a tus clientes.',
}

export type Quote = {
  id: string
  tenant_id: string
  booking_id: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  event_date: string | null
  guests: number | null
  event_type: string | null
  location: string | null
  menu_id: string | null
  menu_name: string | null
  menu_items: unknown
  price_per_pax: number | null
  subtotal: number | null
  tax_rate: number | null
  tax_amount: number | null
  total: number | null
  deposit_amount: number | null
  valid_until: string | null
  notes: string | null
  legal_terms: string | null
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  accept_token: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

interface PageProps {
  searchParams?: { page?: string }
}

export default async function QuotesPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page = Math.max(1, Number(searchParams?.page ?? 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Parallelise: paginated page data + DB-level aggregate counts
  const [pageRes, totalRes, sentRes, acceptedRes, potentialRes] = await Promise.all([
    // Paginated list
    (supabase
      .from('quotes') as any)
      .select(
        'id, client_name, client_email, event_date, guests, total, status, created_at, valid_until',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to),

    // Total count — head: true = no rows transferred
    (supabase
      .from('quotes') as any)
      .select('*', { count: 'exact', head: true }),

    // Sent count
    (supabase
      .from('quotes') as any)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent'),

    // Accepted count
    (supabase
      .from('quotes') as any)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted'),

    // Potential revenue: sent + draft quotes — only fetch total column
    (supabase
      .from('quotes') as any)
      .select('total')
      .in('status', ['sent', 'draft']),
  ])

  const quotes = (pageRes.data ?? []) as Quote[]
  const totalCount = totalRes.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const stats = {
    total: totalCount,
    sent: sentRes.count ?? 0,
    accepted: acceptedRes.count ?? 0,
    potential: (potentialRes.data ?? []).reduce(
      (sum: number, q: any) => sum + (q.total ?? 0),
      0
    ),
  }

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
              Presupuestos
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-1">
              Gestiona y envia propuestas economicas a tus clientes.
            </p>
          </div>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium px-4 py-2 text-[15px] transition-colors shrink-0"
          >
            + Nuevo presupuesto
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total presupuestos', value: String(stats.total) },
            { label: 'Enviados', value: String(stats.sent) },
            { label: 'Aceptados', value: String(stats.accepted) },
            { label: 'Importe potencial', value: formatCurrency(stats.potential) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-[#E5E7EB] rounded-xl p-5"
            >
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                {stat.label}
              </div>
              <div className="font-heading text-[28px] font-semibold text-[#111827] mt-1 tabular-nums">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <ClientQuotes quotes={quotes} />

        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/dashboard/quotes"
          />
        </div>
      </div>
    </div>
  )
}
