import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
  extraParams?: Record<string, string>
}

export function Pagination({ currentPage, totalPages, basePath, extraParams }: PaginationProps) {
  if (totalPages <= 1) return null

  function buildHref(page: number) {
    const params = new URLSearchParams({ ...(extraParams ?? {}), page: String(page) })
    return `${basePath}?${params}`
  }

  const isFirst = currentPage === 1
  const isLast  = currentPage === totalPages

  const btnBase = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150'

  return (
    <div className="flex items-center justify-between bg-white border-t border-[#E5E7EB] px-6 py-4 rounded-b-xl">
      <p className="text-[13px] text-[#6B7280]">
        Página{' '}
        <span className="font-semibold text-[#111827] tabular-nums">{currentPage}</span>{' '}
        de{' '}
        <span className="font-semibold text-[#111827] tabular-nums">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        {isFirst ? (
          <span className={`${btnBase} border-[#E5E7EB] bg-[#F8FAFC] text-[#9CA3AF] cursor-not-allowed select-none`}>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Anterior
          </span>
        ) : (
          <Link
            href={buildHref(currentPage - 1)}
            className={`group ${btnBase} border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAFC] hover:border-[#D1D5DB] active:scale-[0.97]`}
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" strokeWidth={1.5} />
            Anterior
          </Link>
        )}

        {isLast ? (
          <span className={`${btnBase} border-[#E5E7EB] bg-[#F8FAFC] text-[#9CA3AF] cursor-not-allowed select-none`}>
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </span>
        ) : (
          <Link
            href={buildHref(currentPage + 1)}
            className={`group ${btnBase} border-[#0F766E] bg-[#0F766E] text-white hover:bg-[#115E59] hover:border-[#115E59] active:scale-[0.97]`}
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        )}
      </div>
    </div>
  )
}
