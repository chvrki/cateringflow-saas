import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IngredientsClient } from './ingredients-client'
import { Pagination } from '../_components/Pagination'
import type { Ingredient } from '@/types/database'

const PAGE_SIZE = 25

interface PageProps {
  searchParams?: { page?: string; supplier?: string; sort?: string }
}

export default async function IngredientsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page     = Math.max(1, Number(searchParams?.page ?? 1))
  const supplier = searchParams?.supplier ?? ''
  const sort     = searchParams?.sort ?? 'name'
  const from     = (page - 1) * PAGE_SIZE
  const to       = from + PAGE_SIZE - 1

  let query = supabase.from('ingredients').select('*', { count: 'exact' })
  if (supplier) query = query.eq('supplier', supplier)
  if (sort === 'cost_desc')     query = query.order('cost_per_unit', { ascending: false })
  else if (sort === 'cost_asc') query = query.order('cost_per_unit', { ascending: true })
  else                          query = query.order('name', { ascending: true })

  const [pageRes, suppliersRes] = await Promise.all([
    query.range(from, to),
    supabase.from('ingredients').select('supplier').not('supplier', 'is', null).order('supplier'),
  ])

  const ingredients = (pageRes.data ?? []) as Ingredient[]
  const totalCount  = pageRes.count ?? 0
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE)
  const suppliers   = [...new Set(
    (suppliersRes.data ?? []).map((r: { supplier: string | null }) => r.supplier).filter(Boolean) as string[]
  )]

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-10">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
            Ingredientes
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            Catálogo de materias primas con costes y mermas.
          </p>
        </div>

        <IngredientsClient
          ingredients={ingredients}
          totalCount={totalCount}
          suppliers={suppliers}
          currentSupplier={supplier}
          currentSort={sort}
        />

        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} basePath="/dashboard/ingredients" />
        </div>
      </div>
    </div>
  )
}
