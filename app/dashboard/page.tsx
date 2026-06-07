import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardCharts } from './dashboard-charts'
import {
  UtensilsCrossed,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@/types/database'

type Payment = Database['public']['Tables']['payments']['Row']

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmada', cls: 'bg-[#DCFCE7] text-[#16A34A]' },
  pending:   { label: 'Pendiente',  cls: 'bg-[#FEF3C7] text-[#D97706]' },
  cancelled: { label: 'Cancelada',  cls: 'bg-[#FEE2E2] text-[#DC2626]' },
  paid_full: { label: 'Pagada',     cls: 'bg-[#DCFCE7] text-[#16A34A]' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stockAlertsQuery = (
    supabase
      .from('ingredients')
      .select('id, name, unit, stock_quantity, stock_min', { count: 'exact' }) as any
  )
    .eq('stock_is_low', true)
    .gt('stock_min', 0)
    .order('stock_quantity', { ascending: true })
    .limit(5)

  const [bookingsRes, paymentsRes, stockAlertsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, total_amount, created_at, client_name, event_date, guests, menus(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('amount, status, created_at')
      .eq('status', 'completed'),
    stockAlertsQuery,
  ])

  const bookings    = (bookingsRes.data  ?? []) as any[]
  const payments    = (paymentsRes.data  ?? []) as any[]
  const stockAlerts = (stockAlertsRes.data ?? []) as any[]
  const totalAlerts = stockAlertsRes.count ?? 0

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear  = now.getFullYear()

  const isCurrentMonth = (dateStr: string) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }
  const isPrevMonth = (dateStr: string) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const pm = currentMonth === 0 ? 11 : currentMonth - 1
    const py = currentMonth === 0 ? currentYear - 1 : currentYear
    return d.getMonth() === pm && d.getFullYear() === py
  }
  const calcGrowth = (cur: number, prev: number): { pct: number | null; label: string } => {
    if (prev === 0) return { pct: null, label: 'vs mes anterior' }
    return { pct: ((cur - prev) / prev) * 100, label: 'vs mes anterior' }
  }

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length
  const cmBookings      = bookings.filter((b) => isCurrentMonth(b.created_at))
  const pmBookings      = bookings.filter((b) => isPrevMonth(b.created_at))

  const totalClients  = new Set(bookings.map((b) => b.client_name)).size
  const cmClients     = new Set(cmBookings.map((b) => b.client_name)).size
  const pmClients     = new Set(pmBookings.map((b) => b.client_name)).size

  const cmPayments    = payments.filter((p) => isCurrentMonth(p.created_at))
  const pmPayments    = payments.filter((p) => isPrevMonth(p.created_at))
  const cmRevenue     = cmPayments.reduce((s, p) => s + (p.amount ?? 0), 0)
  const pmRevenue     = pmPayments.reduce((s, p) => s + (p.amount ?? 0), 0)

  const cmConfirmed   = cmBookings.filter((b) => b.status === 'confirmed' || b.status === 'paid_full').length
  const pmConfirmed   = pmBookings.filter((b) => b.status === 'confirmed' || b.status === 'paid_full').length
  const cmConversion  = cmBookings.length > 0 ? (cmConfirmed / cmBookings.length) * 100 : 0
  const pmConversion  = pmBookings.length > 0 ? (pmConfirmed / pmBookings.length) * 100 : 0

  const kpis = [
    {
      title: 'Reservas activas',
      value: pendingBookings,
      trend: calcGrowth(cmBookings.length, pmBookings.length),
      icon: Calendar,
    },
    {
      title: 'Clientes totales',
      value: totalClients,
      trend: calcGrowth(cmClients, pmClients),
      icon: Users,
    },
    {
      title: 'Ingresos mensuales',
      value: formatCurrency(cmRevenue),
      trend: calcGrowth(cmRevenue, pmRevenue),
      icon: DollarSign,
    },
    {
      title: 'Tasa de conversión',
      value: `${Math.round(cmConversion)}%`,
      trend: calcGrowth(cmConversion, pmConversion),
      icon: TrendingUp,
    },
  ]

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
            Panel de control
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1">
            Resumen general de tu actividad operativa.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.title}
              className="bg-white border border-[#E5E7EB] rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wide text-[#6B7280] font-medium">
                  {kpi.title}
                </span>
                <kpi.icon className="h-5 w-5 text-[#6B7280] shrink-0" strokeWidth={1.5} />
              </div>
              <div className="text-[28px] font-semibold text-[#111827]">
                {kpi.value}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {kpi.trend.pct === null ? (
                  <span className="text-[12px] text-[#6B7280]">{kpi.trend.label}</span>
                ) : (
                  <>
                    <span
                      className={`text-[12px] font-medium px-2 py-0.5 rounded-full tabular-nums ${
                        kpi.trend.pct >= 0
                          ? 'text-[#16A34A] bg-[#DCFCE7]'
                          : 'text-[#DC2626] bg-[#FEE2E2]'
                      }`}
                    >
                      {kpi.trend.pct > 0 ? '+' : ''}{kpi.trend.pct.toFixed(1)}%
                    </span>
                    <span className="text-[12px] text-[#6B7280]">{kpi.trend.label}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stock alerts */}
        {totalAlerts > 0 && (
          <div className="mb-6 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" strokeWidth={1.5} />
                <span className="text-[15px] font-semibold text-[#111827]">Alertas de stock</span>
                <span className="ml-1 px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] text-[12px] font-medium">
                  {totalAlerts} {totalAlerts === 1 ? 'ingrediente' : 'ingredientes'}
                </span>
              </div>
              <Link
                href="/dashboard/stock?filter=alerts"
                className="text-[13px] text-[#0F766E] hover:text-[#115E59] font-medium transition-colors"
              >
                Ver todos →
              </Link>
            </div>
            <ul className="divide-y divide-[#E5E7EB]">
              {stockAlerts.map((ing: any) => (
                <li
                  key={ing.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                    <span className="text-[14px] font-medium text-[#111827] truncate">{ing.name}</span>
                    <span className="text-[13px] text-[#9CA3AF] shrink-0">{ing.unit}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-[14px] font-semibold text-[#DC2626] tabular-nums">
                      {Number(ing.stock_quantity).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-[13px] text-[#9CA3AF] tabular-nums">
                      mín.{' '}
                      {Number(ing.stock_min).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Charts */}
        <DashboardCharts bookings={bookings} />

        {/* Recent bookings */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#111827]">Reservas recientes</h2>
            <Link
              href="/dashboard/bookings"
              className="text-[13px] text-[#0F766E] hover:text-[#115E59] font-medium transition-colors"
            >
              Ver todas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                <tr>
                  {['Cliente', 'Menú', 'Fecha', 'Personas', 'Importe', 'Estado'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[12px] uppercase tracking-wide text-[#6B7280] font-medium${
                        i >= 4 ? ' text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[14px] text-[#9CA3AF] tabular-nums">
                      No se han registrado reservas aún.
                    </td>
                  </tr>
                ) : (
                  bookings.slice(0, 5).map((b: any) => {
                    const badge = STATUS_MAP[b.status] ?? STATUS_MAP.pending
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors last:border-0"
                      >
                        <td className="px-5 py-3.5 text-[13px] font-medium text-[#111827] tabular-nums">{b.client_name}</td>
                        <td className="px-5 py-3.5 text-[13px] text-[#6B7280] tabular-nums">{b.menus?.name || '—'}</td>
                        <td className="px-5 py-3.5 text-[13px] text-[#6B7280] tabular-nums">
                          {new Date(b.event_date || b.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-[#6B7280] tabular-nums">{b.guests}</td>
                        <td className="px-5 py-3.5 text-[13px] font-semibold text-[#111827] text-right tabular-nums">
                          {formatCurrency(b.total_amount)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
