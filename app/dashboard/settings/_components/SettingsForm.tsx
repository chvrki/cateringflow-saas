'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Save, Upload, Zap, CheckCircle } from 'lucide-react'
import { updateTenantProfile, createCheckoutSession, createPortalSession } from '../actions'
import { Switch } from '@/components/ui/switch'

type Tenant = {
  name: string
  slug: string
  logo_url: string | null
  plan: 'free' | 'pro' | 'enterprise'
  stripe_customer_id: string | null
}

export function SettingsForm({ tenant }: { tenant: Tenant }) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(tenant.name)
  const [slug, setSlug] = useState(tenant.slug)
  const [previewLogo, setPreviewLogo] = useState<string | null>(tenant.logo_url)
  const [notifyNewBooking, setNotifyNewBooking] = useState(true)
  const [notifyConfirmed, setNotifyConfirmed] = useState(true)
  const [notifyCancelled, setNotifyCancelled] = useState(true)
  const [notifyReminder, setNotifyReminder] = useState(false)

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateTenantProfile(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Perfil actualizado correctamente')
      }
    })
  }

  const handleAction = async (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action()
      } catch (err: any) {
        toast.error(err.message || 'Error al procesar la solicitud')
      }
    })
  }

  const inputClass =
    'w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus-visible:border-[#0F766E] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 transition-colors duration-150'
  const fieldLabelClass =
    'text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-1.5 block'

  return (
    <div className="space-y-6">
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h2 className="font-heading text-[17px] font-semibold text-[#111827]">Perfil del negocio</h2>
        <p className="text-[15px] text-[#6B7280] mt-1">
          Personaliza la apariencia pública de tu página de reservas.
        </p>
        <div className="border-t border-[#E5E7EB] mt-4 mb-6" />

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClass}>Nombre del equipo</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={fieldLabelClass}>Identificador (URL)</label>
              <div className="flex">
                <span className="bg-[#F8FAFC] border border-r-0 border-[#E5E7EB] rounded-l-lg px-3 py-2 text-[15px] text-[#9CA3AF]">
                  caterix.app/
                </span>
                <input
                  type="text"
                  name="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className={`${inputClass} rounded-l-none font-mono`}
                  required
                />
              </div>
              <p className="text-[13px] text-[#9CA3AF] mt-1">caterix.app/{slug || '...'}/book</p>
            </div>
          </div>

          <div>
            <label className={`${fieldLabelClass} mb-3`}>Identidad visual</label>
            <div className="flex items-center gap-4">
              {previewLogo ? (
                <img
                  src={previewLogo}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-lg border border-[#E5E7EB] object-contain bg-[#F8FAFC] p-1"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-[#E5E7EB] object-contain bg-[#F8FAFC] p-1 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-[#9CA3AF]" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0">
                <label className="inline-flex items-center border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[15px] cursor-pointer transition-colors duration-150 active:scale-[0.97]">
                  Seleccionar archivo
                  <input
                    type="file"
                    name="logo"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setPreviewLogo(URL.createObjectURL(file))
                    }}
                    className="hidden"
                  />
                </label>
                <p className="text-[15px] text-[#9CA3AF] mt-1">
                  Ningún archivo seleccionado
                </p>
                <p className="text-[13px] text-[#9CA3AF] mt-1">
                  Favorezca formatos PNG translúcidos.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-medium px-4 py-2 text-[15px] transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              <Save className="h-4 w-4" strokeWidth={1.5} />
              Guardar configuración
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-[17px] font-semibold text-[#111827]">Facturación</h2>
            <p className="text-[15px] text-[#6B7280] mt-1">
              Controla las capacidades avanzadas ligadas a la suscripción.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest border ${
              tenant.plan === 'pro'
                ? 'bg-[#CCFBF1] text-[#0F766E] border-[#0F766E]/20'
                : 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'
            }`}
          >
            Plan {tenant.plan === 'pro' ? 'Pro' : 'Free'}
          </span>
        </div>
        <div className="border-t border-[#E5E7EB] mt-4 mb-6" />

        {tenant.plan === 'free' ? (
          <div className="bg-[#CCFBF1] border border-[#0F766E]/20 rounded-xl p-5 flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                <Zap className="text-[#0F766E] w-5 h-5" strokeWidth={1.5} />
                Desbloquea recursos ilimitados
              </h3>
              <p className="text-[15px] text-[#6B7280] mt-1 max-w-lg">
                El plan Pro facilita volúmenes masivos de reservas, documentos nativos en PDF y control anticipado de cobros sin fronteras.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAction(createCheckoutSession)}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white px-5 py-2.5 text-[15px] font-medium whitespace-nowrap transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              Actualizar a Pro
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <p className="text-[15px] font-semibold text-[#111827] flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#16A34A]" strokeWidth={1.5} />
                Plan Pro activo
              </p>
              <p className="text-[15px] text-[#6B7280] mt-1">
                Renovación automática según ciclo de Stripe.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAction(createPortalSession)}
              disabled={isPending}
              className="border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] hover:border-[#D1D5DB] text-[#111827] rounded-lg px-4 py-2 text-[15px] font-medium transition-colors duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              Gestionar suscripción
            </button>
          </div>
        )}
      </section>

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h2 className="font-heading text-[17px] font-semibold text-[#111827]">Notificaciones</h2>
        <p className="text-[15px] text-[#6B7280] mt-1">
          Elige qué eventos te notificamos por email.
        </p>
        <div className="border-t border-[#E5E7EB] mt-4 mb-2" />
        <div className="divide-y divide-[#E5E7EB]">
          <div className="py-3 flex items-start gap-3">
            <Switch checked={notifyNewBooking} onCheckedChange={setNotifyNewBooking} className="data-[state=checked]:bg-[#0F766E] data-[state=unchecked]:bg-[#E5E7EB] mt-0.5" />
            <div>
              <p className="text-[15px] font-medium text-[#111827]">Nueva reserva recibida</p>
              <p className="text-[13px] text-[#6B7280] mt-0.5">Te avisamos cuando un cliente envía una solicitud.</p>
            </div>
          </div>
          <div className="py-3 flex items-start gap-3">
            <Switch checked={notifyConfirmed} onCheckedChange={setNotifyConfirmed} className="data-[state=checked]:bg-[#0F766E] data-[state=unchecked]:bg-[#E5E7EB] mt-0.5" />
            <div>
              <p className="text-[15px] font-medium text-[#111827]">Reserva confirmada</p>
              <p className="text-[13px] text-[#6B7280] mt-0.5">Confirmación enviada al cliente y a ti.</p>
            </div>
          </div>
          <div className="py-3 flex items-start gap-3">
            <Switch checked={notifyCancelled} onCheckedChange={setNotifyCancelled} className="data-[state=checked]:bg-[#0F766E] data-[state=unchecked]:bg-[#E5E7EB] mt-0.5" />
            <div>
              <p className="text-[15px] font-medium text-[#111827]">Reserva cancelada</p>
              <p className="text-[13px] text-[#6B7280] mt-0.5">Alerta cuando una reserva se cancela.</p>
            </div>
          </div>
          <div className="py-3 flex items-start gap-3">
            <Switch checked={notifyReminder} onCheckedChange={setNotifyReminder} className="data-[state=checked]:bg-[#0F766E] data-[state=unchecked]:bg-[#E5E7EB] mt-0.5" />
            <div>
              <p className="text-[15px] font-medium text-[#111827]">Recordatorio 24h antes</p>
              <p className="text-[13px] text-[#6B7280] mt-0.5">Recordatorio del evento al día siguiente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <h2 className="font-heading text-[17px] font-semibold text-[#DC2626]">Zona de peligro</h2>
        <div className="border-t border-[#FEE2E2] mt-4 mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-[#111827]">Eliminar cuenta</p>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              Esta acción es permanente e irreversible.
            </p>
          </div>
          <button
            type="button"
            className="border border-[#DC2626]/20 text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg px-4 py-2 text-[15px] font-medium transition-colors duration-150 active:scale-[0.97]"
          >
            Eliminar cuenta
          </button>
        </div>
      </section>

    </div>
  )
}
