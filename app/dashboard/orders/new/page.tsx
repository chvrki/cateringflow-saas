import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewOrderClient } from './new-order-client'

export type IngredientOption = {
  id: string
  name: string
  unit: string
  stock_quantity: number
  stock_min: number
  stock_is_low: boolean
}

export type SupplierOption = {
  id: string
  name: string
}

export default async function NewOrderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: suppliersData }, { data: ingredientsData }] = await Promise.all([
    (supabase as any)
      .from('suppliers')
      .select('id, name')
      .order('name', { ascending: true }),
    (supabase as any)
      .from('ingredients')
      .select('id, name, unit, stock_quantity, stock_min, stock_is_low')
      .order('name', { ascending: true }),
  ])

  const suppliers = (suppliersData ?? []) as SupplierOption[]
  const allIngredients = (ingredientsData ?? []) as IngredientOption[]
  const alertIngredients = allIngredients.filter(
    (i) => i.stock_is_low && i.stock_min > 0,
  )

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
            Nuevo pedido
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1">Crea un pedido de compra a un proveedor.</p>
        </div>
        <NewOrderClient
          suppliers={suppliers}
          allIngredients={allIngredients}
          alertIngredients={alertIngredients}
        />
      </div>
    </div>
  )
}
