import { ALLERGENS, type AllergenId } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AllergenPickerProps {
  value: AllergenId[]
  onChange: (value: AllergenId[]) => void
}

export function AllergenPicker({ value, onChange }: AllergenPickerProps) {
  const toggle = (id: AllergenId) => {
    if (value.includes(id)) {
      onChange(value.filter((a) => a !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALLERGENS.map((a) => {
        const selected = value.includes(a.id)
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => toggle(a.id)}
            className={cn(
              'inline-flex items-center rounded-lg border px-3 py-1.5 text-[13px] transition-colors',
              selected
                ? 'bg-[#CCFBF1] border-[#0F766E]/30 text-[#0F766E] font-medium'
                : 'bg-white border-[#E5E7EB] text-[#6B7280] font-normal hover:bg-[#F8FAFC]'
            )}
          >
            <span>{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}

