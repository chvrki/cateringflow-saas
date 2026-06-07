import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from './_components/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // RLS scopes the tenant query to the current user's tenant automatically
  const { data: tenant } = await (supabase
    .from('tenants')
    .select('*')
    .single() as any)

  if (!tenant) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-3xl mx-auto px-8 py-8 pb-12">
        <div className="mb-10">
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-[#111827] leading-tight">
            Configuración
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-1.5 leading-relaxed">
            Administra tu perfil, presencia digital pública y suscripción a Caterix.
          </p>
        </div>

        <SettingsForm tenant={tenant} />
      </div>
    </div>
  )
}
