'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  Calendar,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
  ShoppingBasket,
  ClipboardList,
  Package,
  History,
  Truck,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard',          label: 'Panel',         icon: LayoutDashboard, exact: true },
  { href: '/dashboard/menus',    label: 'Menús',          icon: UtensilsCrossed },
  { href: '/dashboard/bookings', label: 'Reservas',       icon: BookOpen },
  { href: '/dashboard/quotes',   label: 'Presupuestos',   icon: FileText },
  { href: '/dashboard/calendar', label: 'Calendario',     icon: Calendar },
]

const costsNav = [
  { href: '/dashboard/ingredients',     label: 'Ingredientes', icon: ShoppingBasket },
  { href: '/dashboard/recipes',         label: 'Escandallos',  icon: ClipboardList },
  { href: '/dashboard/stock',           label: 'Stock',        icon: Package },
  { href: '/dashboard/stock/movements', label: 'Movimientos',  icon: History },
]

const purchasesNav = [
  { href: '/dashboard/suppliers', label: 'Proveedores', icon: Truck },
  { href: '/dashboard/orders',    label: 'Pedidos',     icon: ShoppingCart },
]

const settingsNav = [
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

interface DashboardSidebarProps {
  userName: string
  tenantName: string
  tenantSlug: string
}

export function DashboardSidebar({ userName, tenantName, tenantSlug }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavItem({
    href,
    label,
    icon: Icon,
    exact,
  }: {
    href: string
    label: string
    icon: React.ElementType
    exact?: boolean
  }) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={cn(
          'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] transition-[background-color,color] duration-150 active:scale-[0.98]',
          active
            ? 'bg-[#CCFBF1] text-[#0F766E] font-medium'
            : 'text-[#6B7280] font-normal hover:bg-[#F8FAFC] hover:text-[#111827]',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors duration-150',
            active ? 'text-[#0F766E]' : 'text-[#9CA3AF] group-hover:text-[#6B7280]',
          )}
          strokeWidth={1.5}
        />
        {label}
      </Link>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF] font-medium px-3 mt-6 mb-1.5">
        {label}
      </p>
    )
  }

  return (
    <aside className="w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col h-screen sticky top-0 z-10 font-sans shrink-0">
      {/* Logo */}
      <div className="py-5 px-5 border-b border-[#E5E7EB]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-[#0F766E] flex items-center justify-center shrink-0 transition-transform duration-150 ease-out group-hover:scale-[1.04]">
            <ChefHat className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[#111827] font-sans leading-tight">
              Caterix
            </div>
            <div className="text-[12px] text-[#6B7280] truncate leading-tight mt-0.5">
              {tenantName}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 pt-2 overflow-y-auto">
        <SectionLabel label="Principal" />
        <div className="space-y-0.5">
          {nav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <SectionLabel label="Costes" />
        <div className="space-y-0.5">
          {costsNav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <SectionLabel label="Compras" />
        <div className="space-y-0.5">
          {purchasesNav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <SectionLabel label="Sistema" />
        <div className="space-y-0.5">
          {settingsNav.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {tenantSlug && (
          <>
            <SectionLabel label="Compartir" />
            <div className="space-y-0.5">
              <a
                href={`/${tenantSlug}/book`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827] transition-colors duration-150"
              >
                <ExternalLink className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#6B7280] shrink-0 transition-colors duration-150" strokeWidth={1.5} />
                Página pública
              </a>
            </div>
          </>
        )}
      </nav>

      {/* User area */}
      <div className="border-t border-[#E5E7EB] py-4 px-4">
        <div className="flex items-center gap-3 min-w-0 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#CCFBF1] flex items-center justify-center text-[#0F766E] text-[13px] font-semibold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[#111827] truncate leading-tight">
              {userName}
            </div>
            <div className="text-[12px] text-[#6B7280] truncate leading-tight mt-0.5">
              {tenantName}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827] transition-colors duration-150 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors duration-150" strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
