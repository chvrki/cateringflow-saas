import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'

const CalendarView = dynamic(
  () => import('./_components/CalendarView').then((mod) => mod.CalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl bg-white border border-[#E5E7EB] h-[680px] w-full p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-40 rounded-md bg-[#F8FAFC] animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 rounded-lg bg-[#F8FAFC] animate-pulse" />
            <div className="h-9 w-9 rounded-lg bg-[#F8FAFC] animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-[#F8FAFC] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-[#F8FAFC] animate-pulse"
              style={{ animationDelay: `${(i % 7) * 60}ms` }}
            />
          ))}
        </div>
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
