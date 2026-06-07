import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }
  const { data: profile } = await (supabase
    .from('profiles')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single() as any)

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-[#111827] selection:bg-[#0F766E]/20 selection:text-[#0F766E]">
      <DashboardSidebar
        userName={profile?.full_name ?? user.email ?? 'Usuario'}
        tenantName={(profile as any)?.tenants?.name ?? 'Mi empresa'}
        tenantSlug={(profile as any)?.tenants?.slug ?? ''}
      />
      <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        {children}
      </main>
    </div>
  )
}
