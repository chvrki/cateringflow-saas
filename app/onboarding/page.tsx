"use client"

import { useState, useTransition } from "react"
import { Building2, Link, Loader2 } from "lucide-react"
import { createTenant } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [companyName, setCompanyName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  const handleNameChange = (val: string) => {
    setCompanyName(val)
    if (!slugTouched) {
      const autoSlug = val
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
      setSlug(autoSlug)
      setSlugError(null)
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    setSlugError(null)
    const sanitized = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
    setSlug(sanitized)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSlugError(null)

    startTransition(async () => {
      const result = await createTenant({ companyName, slug })

      if (result.error) {
        if (result.error === 'slug_taken') {
          setSlugError("Este identificador ya está registrado, elige otro")
        } else {
          toast.error(result.error)
        }
      } else if (result.success) {
        toast.success("¡Bienvenido a Caterix!")
        router.push("/dashboard")
      }
    })
  }

  const inputBase =
    "w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3.5 text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 transition-colors duration-150"

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-12 font-sans">

      <div className="w-full max-w-md">
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="px-8 py-10 sm:px-10">
            <div className="text-center mb-10">
              <h1 className="font-heading text-3xl font-semibold text-[#111827] tracking-wide">
                Caterix
              </h1>
            </div>

            <div className="text-center mb-10">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight text-balance">
                Configura tu espacio
              </h2>
              <p className="mt-2 text-[#6B7280] text-sm font-medium">
                Sincronización en tan solo unos segundos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="company-name"
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]"
                >
                  <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Nombre comercial
                </label>
                <input
                  type="text"
                  id="company-name"
                  value={companyName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Catering Las Encinas"
                  className={inputBase}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="url-slug"
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]"
                >
                  <Link className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Identificador URL
                </label>
                <div>
                  <input
                    type="text"
                    id="url-slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="las-encinas"
                    className={`${inputBase} font-mono text-sm ${
                      slugError ? "border-[#DC2626]/30 focus:border-[#DC2626] focus:ring-[#DC2626]/20" : ""
                    }`}
                    required
                    disabled={isPending}
                  />
                </div>
                {slugError && (
                  <p className="text-xs font-semibold text-[#DC2626] pl-1 mt-1">
                    {slugError}
                  </p>
                )}
                <p className="text-xs font-medium text-[#6B7280] pl-1 pt-1 tracking-wide">
                  <span className="text-[#9CA3AF]">caterix.app/</span>
                  <span className="text-[#0F766E] font-mono">
                    {slug || "..."}
                  </span>
                  <span className="text-[#9CA3AF]">/book</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-10 bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold py-3.5 px-6 rounded-lg transition-colors duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Procesando...
                  </>
                ) : (
                  "Desplegar aplicación"
                )}
              </button>
            </form>
          </div>

          <div className="bg-[#F8FAFC] border-t border-[#E5E7EB] px-8 py-5 text-center">
            <p className="text-xs text-[#6B7280]">
              Al continuar confirmas aceptar los{" "}
              <a href="#" className="font-medium text-[#111827] hover:text-[#0F766E] transition-colors duration-150 underline underline-offset-2">
                Términos de la plataforma
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
