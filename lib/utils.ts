import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Calculate booking total: guests × pricePerPerson + extras */
export function calculateTotal(
  guests: number,
  pricePerPerson: number,
  extras: { price: number; quantity: number }[] = []
): number {
  const menuTotal = guests * pricePerPerson
  const extrasTotal = extras.reduce((sum, e) => sum + e.price * e.quantity, 0)
  return menuTotal + extrasTotal
}

/** Calculate 30% deposit, rounded to 2 decimal places */
export function calculateDeposit(total: number): number {
  return Math.round(total * 0.30 * 100) / 100
}

/** Format currency in euros */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount)
}

/** All supported allergens */
export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', emoji: '🌾' },
  { id: 'crustaceos', label: 'Crustáceos', emoji: '🦐' },
  { id: 'huevos', label: 'Huevos', emoji: '🥚' },
  { id: 'pescado', label: 'Pescado', emoji: '🐟' },
  { id: 'cacahuetes', label: 'Cacahuetes', emoji: '🥜' },
  { id: 'soja', label: 'Soja', emoji: '🫘' },
  { id: 'lactosa', label: 'Lácteos', emoji: '🥛' },
  { id: 'frutos_secos', label: 'Frutos secos', emoji: '🌰' },
  { id: 'apio', label: 'Apio', emoji: '🥬' },
  { id: 'mostaza', label: 'Mostaza', emoji: '🌻' },
  { id: 'sesamo', label: 'Sésamo', emoji: '🌱' },
  { id: 'sulfitos', label: 'Sulfitos', emoji: '🍷' },
  { id: 'altramuces', label: 'Altramuces', emoji: '🌼' },
  { id: 'moluscos', label: 'Moluscos', emoji: '🦪' },
] as const

export type AllergenId = typeof ALLERGENS[number]['id']

/** Check if any menu item contains an allergen declared by a client */
export function hasAllergenConflict(
  clientAllergens: string[],
  menuAllergens: string[]
): boolean {
  return clientAllergens.some((a) => menuAllergens.includes(a))
}

/** Display labels for menu item categories */
export const CATEGORY_LABELS: Record<string, string> = {
  entrante: 'Entrante',
  principal: 'Principal',
  postre: 'Postre',
  bebida: 'Bebida',
  extra: 'Extra',
}
