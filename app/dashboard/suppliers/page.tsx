import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuppliersClient } from './suppliers-client'

export type SupplierRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('suppliers')
    .select('id, name, email, phone, notes, created_at')
    .order('name', { ascending: true })

  const suppliers = (data ?? []) as SupplierRow[]

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827]">
            Proveedores
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1">
            Gestiona tus proveedores de materias primas.
          </p>
        </div>

        <SuppliersClient suppliers={suppliers} />
      </div>
    </div>
  )
}
