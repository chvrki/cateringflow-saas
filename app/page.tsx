import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ChefHat,
  CalendarDays,
  UtensilsCrossed,
  Globe2,
  CheckCircle2,
  ArrowRight,
  MonitorSmartphone,
} from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-stone-800 bg-stone-950/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:bg-amber-400 transition-colors">
              <ChefHat className="h-5 w-5 text-stone-950" />
            </div>
            <span className="text-xl font-bold text-stone-100 font-heading tracking-wider">Caterix</span>
          </Link>
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-stone-400">
            <a href="#problema" className="hover:text-amber-500 transition-colors">Características</a>
            <a href="#ventajas" className="hover:text-amber-500 transition-colors">Funcionamiento</a>
            <a href="#precios" className="hover:text-amber-500 transition-colors">Precios</a>
          </div>

          <div>
            {user ? (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-sm font-semibold transition-colors border border-stone-700 hover:border-stone-600"
              >
                Ir al dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-stone-400 hover:text-stone-200 hidden md:block transition-colors">
                  Iniciar sesión
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-sm font-bold transition-all hover:shadow-lg hover:shadow-amber-500/20"
                >
                  Crear cuenta gratis
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* 2. Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-stone-50 font-heading leading-tight max-w-4xl mx-auto tracking-tight">
              Gestiona tu empresa de catering <span className="text-amber-500 italic">sin caos</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed">
              Centraliza tus reservas, menús, y programación en un solo lugar. Elimina de una vez por todas los Excel, cadenas de WhatsApp y errores humanos.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-base font-bold transition-all hover:shadow-xl hover:shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                Crear cuenta gratis <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#ventajas"
                className="px-8 py-4 w-full sm:w-auto bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 rounded-xl text-base font-semibold transition-all"
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Application Mockup constructed purely with HTML/CSS */}
            <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border border-stone-800 bg-stone-950/50 shadow-2xl shadow-black overflow-hidden ring-1 ring-white/10 backdrop-blur-xl">
              <div className="flex items-center px-4 py-3 border-b border-stone-800 bg-stone-900/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto bg-stone-950 border border-stone-800 rounded-md px-3 py-1 flex items-center gap-2 text-xs text-stone-500">
                  <Globe2 className="w-3 h-3" /> dashboard.caterix.com
                </div>
              </div>
              <div className="flex h-[450px]">
                {/* Sidebar mock */}
                <div className="w-56 border-r border-stone-800 p-4 space-y-6 hidden md:block bg-stone-950">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-500" />
                    <div className="h-4 w-24 bg-stone-800 rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-9 w-full bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center px-3 gap-3">
                       <div className="w-4 h-4 rounded bg-amber-500/50" />
                       <div className="h-3 w-16 bg-amber-500/50 rounded" />
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-9 w-full bg-transparent rounded-lg flex items-center px-3 gap-3">
                         <div className="w-4 h-4 rounded bg-stone-800" />
                         <div className="h-3 w-20 bg-stone-800 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Main area mock */}
                <div className="flex-1 p-6 space-y-6 bg-stone-950 overflow-hidden relative">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="h-6 w-32 bg-stone-200 rounded mb-2" />
                      <div className="h-4 w-48 bg-stone-700 rounded" />
                    </div>
                    <div className="h-10 w-32 bg-amber-500 rounded-lg" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { l: 'Reservas Hoy', w1: '12', w2: '+3 desde ayer' },
                      { l: 'Ingresos Mensuales', w1: '€4,250', w2: '↑ 12%' },
                      { l: 'Tasa Confirmación', w1: '95%', w2: 'Estable' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                         <div className="text-xs text-stone-500 font-medium mb-2">{stat.l}</div>
                         <div className="text-2xl font-bold text-stone-100 mb-1">{stat.w1}</div>
                         <div className="text-xs text-amber-500">{stat.w2}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-stone-900 border border-stone-800 rounded-xl flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900/50">
                       <div className="h-4 w-32 bg-stone-700 rounded" />
                    </div>
                    <div className="p-4 space-y-3">
                       {[1, 2].map(row => (
                         <div key={row} className="flex items-center justify-between p-3 rounded-lg border border-stone-800 bg-stone-950">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-stone-800" />
                             <div>
                               <div className="h-3 w-24 bg-stone-300 rounded mb-1.5" />
                               <div className="h-2 w-32 bg-stone-700 rounded" />
                             </div>
                           </div>
                           <div className="h-6 w-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                             <div className="h-1.5 w-10 bg-green-500/70 rounded-full" />
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                  
                  {/* Subtle fade out at bottom of mock */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-stone-950 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Problem Section */}
        <section id="problema" className="py-24 bg-stone-900 border-y border-stone-800 relative z-10">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-50 font-heading mb-4">
                El caos actual frena tu crecimiento
              </h2>
              <p className="text-stone-400">
                Las bandejas de WhatsApp llenas y los presupuestos perdidos en hojas de cálculo no son sostenibles.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Bad state */}
              <div className="bg-stone-950 border border-red-900/30 rounded-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <div className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">Antiguo método</div>
                </div>
                <ul className="space-y-6 mt-4">
                  <li className="flex gap-3 text-stone-400">
                    <span className="text-red-500">✕</span> Mensajes perdidos entre clientes y proveedores.
                  </li>
                  <li className="flex gap-3 text-stone-400">
                    <span className="text-red-500">✕</span> Menús guardados en múltiples Pdfs desactualizados.
                  </li>
                  <li className="flex gap-3 text-stone-400">
                    <span className="text-red-500">✕</span> Errores en facturación por duplicidades en calendarios manuales.
                  </li>
                </ul>
              </div>
              
              {/* Good state */}
              <div className="bg-stone-950 border border-amber-500/30 rounded-xl p-8 relative overflow-hidden shadow-[0_0_30px_-5px_rgba(217,119,6,0.15)]">
                <div className="absolute top-0 right-0 p-4">
                  <div className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3"/> Con Caterix
                  </div>
                </div>
                <ul className="space-y-6 mt-4">
                  <li className="flex gap-3 text-stone-200">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Portal público sincronizado en tiempo real.
                  </li>
                  <li className="flex gap-3 text-stone-200">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Constructor visual de menús con gestión de precios.
                  </li>
                  <li className="flex gap-3 text-stone-200">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Reservas, estados y pagos unificados en el panel.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Features Section */}
        <section id="ventajas" className="py-24 bg-stone-950 relative">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-5xl font-bold text-center text-stone-50 font-heading mb-20">
              Un producto, todo tu negocio operativo
            </h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              
              {/* Feature 1 */}
              <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl flex flex-col">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6">
                  <CalendarDays className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-stone-50 mb-2 font-heading">Calendario Maestro</h3>
                <p className="text-stone-400 text-sm mb-8 flex-1">
                  Tu equipo y eventos en una vista mensual. Aprobar, cancelar o cobrar a un simple clic de distancia.
                </p>
                {/* HTML Mockup */}
                <div className="h-32 bg-stone-950 rounded-lg p-3 border border-stone-800">
                  <div className="grid grid-cols-7 gap-1 h-full">
                    {[...Array(7)].map((_, i) => (
                      <div key={`col-${i}`} className="space-y-1">
                        <div className="h-2 w-full bg-stone-800 rounded opacity-50" />
                        {i === 2 && <div className="h-6 w-full bg-amber-500/20 border border-amber-500/40 rounded mt-2" />}
                        {i === 5 && <div className="h-4 w-full bg-green-500/20 border border-green-500/40 rounded mt-4" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl flex flex-col">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6">
                  <UtensilsCrossed className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-stone-50 mb-2 font-heading">Constructor de Menús</h3>
                <p className="text-stone-400 text-sm mb-8 flex-1">
                  Precios vinculados y platillos detallados. Reutilízalos en múltiples temporadas rápidamente.
                </p>
                {/* HTML Mockup */}
                <div className="h-32 bg-stone-950 rounded-lg p-3 border border-stone-800 flex flex-col gap-2">
                  <div className="p-2 border border-stone-800 rounded flex justify-between items-center bg-stone-900">
                    <div className="h-2 w-16 bg-stone-400 rounded" />
                    <div className="h-2 w-8 bg-amber-500 rounded" />
                  </div>
                  <div className="p-2 border border-stone-800 rounded flex justify-between items-center bg-stone-900">
                    <div className="h-2 w-20 bg-stone-400 rounded" />
                    <div className="h-2 w-8 bg-amber-500 rounded" />
                  </div>
                  <div className="p-2 border border-stone-800 rounded flex justify-between items-center bg-stone-900">
                    <div className="h-2 w-14 bg-stone-400 rounded" />
                    <div className="h-2 w-8 bg-stone-600 rounded opacity-50" />
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl flex flex-col">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6">
                  <MonitorSmartphone className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-stone-50 mb-2 font-heading">Portal de Clientes</h3>
                <p className="text-stone-400 text-sm mb-8 flex-1">
                  Página 100% pública para la recepción de solicitudes, optimizada y vinculada automáticamente a tu admin.
                </p>
                {/* HTML Mockup */}
                <div className="h-32 bg-stone-950 rounded-lg p-3 border border-stone-800 relative overflow-hidden">
                  <div className="w-full h-8 bg-stone-900 rounded border border-stone-800 mb-2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 bg-stone-800 rounded" />
                    <div className="h-16 bg-stone-800 rounded" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-stone-950 to-transparent" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 5. How it works */}
        <section className="py-24 bg-stone-900 border-t border-stone-800">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="text-3xl font-bold text-center text-stone-50 mb-16 font-heading">
              En marcha en 3 sencillos pasos
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-center relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-[24px] left-[15%] right-[15%] h-[1px] bg-stone-800" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 mx-auto bg-stone-950 border border-stone-700 rounded-full flex items-center justify-center text-amber-500 font-bold mb-4 shadow-xl">1</div>
                <h4 className="text-lg font-bold text-stone-50 mb-2 font-heading">Regístrate</h4>
                <p className="text-sm text-stone-400">Crea la cuenta de tu catering en menos de 1 minuto vinculando tu correo.</p>
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 mx-auto bg-stone-950 border border-amber-500/50 rounded-full flex items-center justify-center text-amber-500 font-bold mb-4 shadow-[0_0_15px_-3px_rgba(217,119,6,0.3)]">2</div>
                <h4 className="text-lg font-bold text-stone-50 mb-2 font-heading">Configura menús</h4>
                <p className="text-sm text-stone-400">Personaliza tus precios, menús actuales y activa tu propio enlace /reserva.</p>
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 mx-auto bg-stone-950 border border-stone-700 rounded-full flex items-center justify-center text-amber-500 font-bold mb-4 shadow-xl">3</div>
                <h4 className="text-lg font-bold text-stone-50 mb-2 font-heading">Recibe eventos</h4>
                <p className="text-sm text-stone-400">Dile adiós a transcribir datos; tus clientes confirmarán todo online a través del portal.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Pricing */}
        <section id="precios" className="py-24 bg-stone-950 border-t border-stone-800">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-5xl font-bold text-center text-stone-50 font-heading mb-16">
              Precios claros, sin sorpresas
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              
              {/* Free */}
              <div className="bg-stone-900 border border-stone-800 p-8 rounded-xl flex flex-col">
                <h3 className="text-2xl font-bold text-stone-50 mb-2 font-heading">Free</h3>
                <div className="text-4xl font-bold text-stone-100 mb-6 font-heading">
                  €0 <span className="text-lg text-stone-500 font-normal font-sans">/mes</span>
                </div>
                <p className="text-stone-400 mb-8 border-b border-stone-800 pb-8">
                  Para negocios pequeños que buscan comenzar la digitalización.
                </p>
                <ul className="space-y-4 flex-1 mb-8">
                  <li className="flex gap-3 text-stone-300"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Reservas ilimitadas</li>
                  <li className="flex gap-3 text-stone-300"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Portal público con slug propio</li>
                  <li className="flex gap-3 text-stone-300"><CheckCircle2 className="w-5 h-5 text-stone-600 shrink-0" /> Notificaciones email básicas</li>
                </ul>
                <Link
                  href="/signup"
                  className="w-full block text-center py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-semibold transition-colors border border-stone-700"
                >
                  Empezar gratis
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-500/30 shadow-[0_0_30px_-5px_rgba(217,119,6,0.1)] p-8 rounded-xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-stone-950 text-xs font-bold py-1 px-3 rounded-bl-lg">RECOMENDADO</div>
                <h3 className="text-2xl font-bold text-stone-50 mb-2 font-heading">Pro</h3>
                <div className="text-4xl font-bold text-stone-100 mb-6 font-heading">
                  €49 <span className="text-lg text-stone-500 font-normal font-sans">/mes</span>
                </div>
                <p className="text-stone-400 mb-8 border-b border-stone-800 pb-8">
                  La solución definitiva para organizar flujos constantes de eventos.
                </p>
                <ul className="space-y-4 flex-1 mb-8">
                  <li className="flex gap-3 text-stone-300"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Todo lo incluido en Free</li>
                  <li className="flex gap-3 text-stone-300"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Adjuntos PDF automatizados</li>
                  <li className="flex gap-3 text-stone-300"><CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" /> Pagos & Depósitos por Stripe (Próximamente)</li>
                </ul>
                <Link
                  href="/signup"
                  className="w-full block text-center py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-bold transition-colors"
                >
                  Mejorar tu catering
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className="py-24 relative overflow-hidden bg-stone-950">
          <div className="absolute inset-0 bg-amber-500/5" />
          <div className="container mx-auto px-6 relative z-10 text-center border-y border-stone-800/50 py-20 bg-stone-900/50 backdrop-blur-3xl rounded-3xl max-w-5xl">
            <h2 className="text-4xl md:text-5xl font-bold text-stone-50 font-heading mb-6">
              El tiempo es el recurso más caro.
            </h2>
            <p className="text-xl text-stone-400 mb-10 max-w-2xl mx-auto">
              Empieza a ahorrar horas hoy mismo optimizando tus canales comerciales y calendarios centralizados.
            </p>
            <Link
              href="/signup"
              className="px-10 py-5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-lg font-bold transition-all hover:shadow-2xl hover:shadow-amber-500/20 inline-flex items-center gap-2"
            >
              Crear cuenta gratis <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="bg-stone-950 border-t border-stone-900 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 grayscale opacity-50">
            <ChefHat className="w-5 h-5 text-stone-500" />
            <span className="font-bold text-stone-400 font-heading text-xl">Caterix</span>
          </div>
          <div className="text-stone-600 text-sm">
            © 2026 Caterix. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
