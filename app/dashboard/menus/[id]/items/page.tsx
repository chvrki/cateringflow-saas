import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MenuItemsManager } from '@/components/dashboard/menu-items-manager'
import type { Database } from '@/types/database'

type Menu = Database['public']['Tables']['menus']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default async function MenuItemsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS scopes all queries to the current user's tenant automatically.
  // Fetch menu and its items in parallel.
  const [menuRes, itemsRes] = await Promise.all([
    supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', id)
      .order('sort_order', { ascending: true }),
  ])

  const menu = menuRes.data as unknown as Menu | null
  if (!menu) notFound()

  const items = (itemsRes.data ?? []) as unknown as MenuItem[]

  return (
    <MenuItemsManager
      menu={menu}
      initialItems={items ?? []}
      tenantId={menu.tenant_id}
    />
  )
}
