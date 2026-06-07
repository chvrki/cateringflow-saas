import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Quote } from '../page'
import { QuoteDetail } from './quote-detail'

interface Props {
  params: { id: string }
}

export async function generateMetadata() {
  return {
    title: 'Presupuesto · Caterix',
    description: 'Detalle del presupuesto',
  }
}

export default async function QuoteDetailPage({ params }: Props) {
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

  const { data: quoteRes } = await (supabase
    .from('quotes') as any)
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', profile?.tenant_id ?? '')
    .single()

  if (!quoteRes) notFound()

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <QuoteDetail quote={quoteRes as Quote} />
      </div>
    </div>
  )
}
