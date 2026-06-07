import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewQuoteForm } from './new-quote-form'

export const metadata = {
  title: 'Nuevo presupuesto · Caterix',
  description: 'Crea un nuevo presupuesto para un cliente.',
}

export type MenuOption = {
  id: string
  name: string
  description: string | null
  price_per_pax: number
  min_guests: number | null
  max_guests: number | null
}

export default async function NewQuotePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single() as any)

  const { data: menusRes } = await (supabase
    .from('menus')
    .select('id, name, description, price_per_person, min_guests, max_guests')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .eq('active', true)
    .order('name') as any)

  const menus: MenuOption[] = ((menusRes ?? []) as any[]).map((menu) => ({
    id: menu.id,
    name: menu.name,
    description: menu.description ?? null,
    price_per_pax: menu.price_per_person ?? 0,
    min_guests: menu.min_guests ?? null,
    max_guests: menu.max_guests ?? null,
  }))

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <NewQuoteForm menus={menus} />
      </div>
    </div>
  )
}
