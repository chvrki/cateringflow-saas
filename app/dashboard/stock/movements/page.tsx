import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MovementsClient } from './movements-client'
import { Pagination } from '../../_components/Pagination'

const PAGE_SIZE = 25

export type MovementRow = {
  id: string
  type: 'entrada' | 'salida' | 'ajuste'
  quantity: number
  reason: string | null
  notes: string | null
  created_at: string
  ingredients: { name: string; unit: string } | null
  bookings: { client_name: string; event_date: string | null } | null
}

export type IngredientOption = {
  id: string
  name: string
}

interface PageProps {
  searchParams?: {
    page?: string
    ingredient?: string
    type?: string
    from?: string
    to?: string
  }
}

export default async function MovementsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const page           = Math.max(1, Number(searchParams?.page ?? 1))
  const ingredientId   = searchParams?.ingredient ?? ''
  const typeFilter     = searchParams?.type ?? ''
  const fromDate       = searchParams?.from ?? ''
  const toDate         = searchParams?.to ?? ''
  const rangeFrom      = (page - 1) * PAGE_SIZE
  const rangeTo        = rangeFrom + PAGE_SIZE - 1

  let query = supabase
    .from('stock_movements')
    .select(
      'id, type, quantity, reason, notes, created_at, ingredients ( name, unit ), bookings ( client_name, event_date )',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (ingredientId) query = query.eq('ingredient_id', ingredientId)
  if (typeFilter)   query = query.eq('type', typeFilter)
  if (fromDate)     query = query.gte('created_at', `${fromDate}T00:00:00`)
  if (toDate)       query = query.lte('created_at', `${toDate}T23:59:59`)

  const [movementsRes, ingredientsRes] = await Promise.all([
    query.range(rangeFrom, rangeTo),
    supabase
      .from('ingredients')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  const movements       = (movementsRes.data ?? []) as MovementRow[]
  const totalPages      = Math.ceil((movementsRes.count ?? 0) / PAGE_SIZE)
  const allIngredients  = (ingredientsRes.data ?? []) as IngredientOption[]

  // Build extraParams to preserve active filters across pagination
  const extraParams: Record<string, string> = {}
  if (ingredientId) extraParams.ingredient = ingredientId
  if (typeFilter)   extraParams.type       = typeFilter
  if (fromDate)     extraParams.from       = fromDate
  if (toDate)       extraParams.to         = toDate

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-10">
          <Link
            href="/dashboard/stock"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#6B7280] hover:text-[#0F766E] transition-colors duration-150 mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Volver al stock
          </Link>
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
            Historial de movimientos
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            Registro completo de entradas, salidas y ajustes de inventario.
          </p>
        </div>

        <MovementsClient
          movements={movements}
          allIngredients={allIngredients}
          activeFilters={{ ingredientId, typeFilter, fromDate, toDate }}
        />

        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/dashboard/stock/movements"
            extraParams={Object.keys(extraParams).length ? extraParams : undefined}
          />
        </div>
      </div>
    </div>
  )
}
