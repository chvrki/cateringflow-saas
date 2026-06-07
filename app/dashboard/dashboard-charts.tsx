'use client'

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts'

export function DashboardCharts({ bookings }: { bookings: any[] }) {
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return d.toLocaleString('es-ES', { month: 'short' })
  })

  const areaData = months.map((m) => ({
    name: m.charAt(0).toUpperCase() + m.slice(1),
    total: bookings.filter((b) => {
      const d = new Date(b.event_date || b.created_at)
      return d.toLocaleString('es-ES', { month: 'short' }) === m
    }).length,
  }))

  let conf = 0, pend = 0, canc = 0
  bookings.forEach((b) => {
    if (b.status === 'confirmed' || b.status === 'paid_full') conf++
    else if (b.status === 'cancelled') canc++
    else pend++
  })

  const pieData =
    conf === 0 && pend === 0 && canc === 0
      ? [{ name: 'Sin datos', value: 1, color: '#E5E7EB' }]
      : [
          { name: 'Confirmadas', value: conf, color: '#16A34A' },
          { name: 'Pendientes',  value: pend, color: '#D97706' },
          { name: 'Canceladas',  value: canc, color: '#9CA3AF' },
        ].filter((d) => d.value > 0)

  const tooltipStyle = {
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    fontSize: '13px',
    color: '#111827',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      {/* Area chart */}
      <div className="col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-[#111827]">Reservas por mes</h3>
        <p className="text-[13px] text-[#6B7280] mb-6">Últimos 6 meses</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0F766E" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                dy={8}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#0F766E"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
                dot={false}
                activeDot={{ r: 4, fill: '#0F766E', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie chart */}
      <div className="col-span-1 bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-[#111827]">Por estado</h3>
        <p className="text-[13px] text-[#6B7280] mb-6">Distribución actual</p>
        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={76}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#6B7280' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
