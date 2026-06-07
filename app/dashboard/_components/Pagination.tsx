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

  const btnBase = 'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors'

  return (
    <div className="flex items-center justify-between bg-white border-t border-[#E8E8ED] px-6 py-4 rounded-b-2xl">
      <p className="text-[13px] text-[#6E6E73]">
        Página{' '}
        <span className="font-semibold text-[#1D1D1F]">{currentPage}</span>{' '}
        de{' '}
        <span className="font-semibold text-[#1D1D1F]">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        {isFirst ? (
          <span className={`${btnBase} border-[#E8E8ED] bg-[#F5F5F7] text-[#AEAEB2] cursor-not-allowed select-none`}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </span>
        ) : (
          <Link
            href={buildHref(currentPage - 1)}
            className={`${btnBase} border-[#E8E8ED] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Link>
        )}

        {isLast ? (
          <span className={`${btnBase} border-[#E8E8ED] bg-[#F5F5F7] text-[#AEAEB2] cursor-not-allowed select-none`}>
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Link
            href={buildHref(currentPage + 1)}
            className={`${btnBase} border-[#0071E3] bg-[#0071E3] text-white hover:bg-[#0077ED]`}
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}
