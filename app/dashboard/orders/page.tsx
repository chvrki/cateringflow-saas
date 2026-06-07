import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrdersClient } from './orders-client'

const PAGE_SIZE = 20

export type OrderRow = {
  id: string
  status: 'borrador' | 'enviado' | 'recibido' | 'cancelado'
  notes: string | null
  sent_at: string | null
  received_at: string | null
  created_at: string
  suppliers: { name: string } | null
  purchase_order_items: { id: string }[]
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const statusFilter = searchParams.status ?? ''
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = (supabase as any)
    .from('purchase_orders')
    .select(
      'id, status, notes, sent_at, received_at, created_at, suppliers(name), purchase_order_items(id)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, count } = await query
  const orders = (data ?? []) as OrderRow[]
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
            Pedidos de compra
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1">Gestiona los pedidos a proveedores.</p>
        </div>
        <OrdersClient
          orders={orders}
          totalPages={totalPages}
          currentPage={page}
          statusFilter={statusFilter}
        />
      </div>
    </div>
  )
}
