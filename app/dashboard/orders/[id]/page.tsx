import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OrderDetailClient } from './order-detail-client'

export type OrderItem = {
  id: string
  ingredient_id: string
  quantity_ordered: number
  quantity_received: number | null
  unit: string
  unit_price: number | null
  notes: string | null
  ingredients: { name: string; unit: string } | null
}

export type OrderDetail = {
  id: string
  status: 'borrador' | 'enviado' | 'recibido' | 'cancelado'
  notes: string | null
  sent_at: string | null
  received_at: string | null
  created_at: string
  suppliers: { name: string } | null
  purchase_order_items: OrderItem[]
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await (supabase as any)
    .from('purchase_orders')
    .select(
      'id, status, notes, sent_at, received_at, created_at, suppliers(name), purchase_order_items(id, ingredient_id, quantity_ordered, quantity_received, unit, unit_price, notes, ingredients(name, unit))',
    )
    .eq('id', params.id)
    .single()

  if (!data) notFound()

  return (
    <div className="min-h-screen w-full print:bg-white">
      <div className="max-w-7xl mx-auto px-8 py-8 print:p-4">
        <OrderDetailClient order={data as OrderDetail} />
      </div>
    </div>
  )
}
