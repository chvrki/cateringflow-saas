import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { BookingForm } from './_components/BookingForm'
import { UtensilsCrossed, AlertCircle } from 'lucide-react'
import Image from 'next/image'

type Params = {
  slug: string
}

export default async function PublicBookingPage({ params }: { params: Params }) {
  const supabase = await createClient()
  const { slug } = params

  const { data: tenant } = await (supabaseAdmin
    .from('tenants')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .single() as any)

  if (!tenant) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#D97706] mx-auto" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-[#111827]">
            Página no encontrada
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Este enlace de reserva no existe o ha sido desactivado.
          </p>
        </div>
      </div>
    )
  }

  const { data: menus } = await (supabase
    .from('menus')
    .select('id, name, description, price_per_person')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('price_per_person', { ascending: true }) as any)

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#111827] font-sans selection:bg-[#CCFBF1] selection:text-[#0F766E]">
      <header className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {tenant.logo_url ? (
            <Image
              src={tenant.logo_url}
              alt={`Logo de ${tenant.name}`}
              width={40}
              height={40}
              className="object-contain rounded-lg border border-[#E5E7EB] bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] text-[#0F766E] font-semibold text-sm flex items-center justify-center border border-[#0F766E]/20">
              {(tenant.name || 'CT').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-heading text-base font-semibold text-[#111827] truncate">
              {tenant.name}
            </h1>
            <p className="text-sm text-[#6B7280]">Solicitud de reserva</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8 text-center space-y-2">
          <h2 className="font-heading text-3xl font-bold text-[#111827] leading-tight">
            Haz tu reserva
          </h2>
          <p className="text-base text-[#6B7280] max-w-md mx-auto leading-relaxed">
            Selecciona el menú que mejor se adapte a tu evento y déjanos tus datos. Nos pondremos en contacto contigo pronto.
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 mt-8">
          <BookingForm
            tenantId={tenant.id}
            menus={menus || []}
            tenantName={tenant.name}
          />
        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] mt-20 py-8 text-center bg-[#F8FAFC]">
        <p className="text-[#6B7280] text-sm">
          Impulsado por <span className="text-[#0F766E] font-semibold">Caterix</span>
        </p>
      </footer>
    </div>
  )
}
