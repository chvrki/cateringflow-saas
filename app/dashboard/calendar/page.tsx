import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'

const CalendarView = dynamic(
  () => import('./_components/CalendarView').then((mod) => mod.CalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-xl bg-[#F8FAFC] h-[680px] w-full flex items-center justify-center border border-[#E5E7EB]">
        <span className="text-[#9CA3AF] text-[15px]">Cargando calendario...</span>
      </div>
    ),
  }
)

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // RLS scopes all queries to the current user's tenant automatically
  const { data: bookings } = await (supabase
    .from('bookings')
    .select(`
      *,
      menus (
        name
      )
    `) as any)

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <CalendarView initialBookings={bookings || []} />
      </div>
    </div>
  )
}
