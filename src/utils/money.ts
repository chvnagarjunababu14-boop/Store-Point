/**
 * Money utilities using integer minor units (paise).
 * 1 Rupee = 100 Paise.
 * Guarantees arithmetic stability and zero IEEE-754 precision issues.
 */

/**
 * Convert integer paise to a standard float rupee amount
 * e.g. 10000000 -> 100000.00, 12550 -> 125.50, 1 -> 0.01
 */
export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0
  return Math.round(paise) / 100
}

/**
 * Safely parse any rupee float or string input into integer paise
 * e.g. 125.5 -> 12550, "99.99" -> 9999, "1,00,000.00" -> 10000000
 */
export function rupeesToPaise(amount: number | string): number {
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    if (isNaN(parsed)) return 0
    return Math.round(parsed * 100)
  }
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100)
}

/**
 * Format integer paise into an Indian Rupee (INR / ₹) formatted currency string
 * Uses the Indian numbering system (en-IN) with lakhs and crores.
 * e.g. 1 -> "₹0.01"
 *      12550 -> "₹125.50"
 *      10000000 -> "₹1,00,000.00"
 */
export function formatINR(
  paise: number,
  options: {
    currency?: string
    showSymbol?: boolean
    showSign?: boolean
    compact?: boolean
  } = {}
): string {
  const { currency = '₹', showSymbol = true, showSign = false, compact = false } = options
  const rupees = paiseToRupees(paise)

  const prefix = showSymbol ? currency : ''

  if (compact && Math.abs(rupees) >= 1000) {
    const absVal = Math.abs(rupees)
    const sign = rupees < 0 ? '-' : showSign && rupees > 0 ? '+' : ''
    if (absVal >= 10_000_000) {
      // 1 Crore = 1,00,00,000
      return `${sign}${prefix}${(absVal / 10_000_000).toFixed(2)} Cr`
    }
    if (absVal >= 100_000) {
      // 1 Lakh = 1,00,000
      return `${sign}${prefix}${(absVal / 100_000).toFixed(2)} L`
    }
    return `${sign}${prefix}${(absVal / 1_000).toFixed(1)}k`
  }

  const sign = rupees < 0 ? '-' : showSign && rupees > 0 ? '+' : ''
  const absRupees = Math.abs(rupees)

  const formatted = absRupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${sign}${prefix}${formatted}`
}

/**
 * Format integer paise into plain tabular numerical string using en-IN
 * e.g. 10000000 -> "1,00,000.00", 12550 -> "125.50", 1 -> "0.01"
 */
export function paiseToTabular(paise: number): string {
  const rupees = Math.abs(paiseToRupees(paise))
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Calculate profit margin percentage with division-by-zero protection
 * Returns a number rounded to 1 decimal place, e.g. 46.6
 */
export function calculateMarginPercent(revenuePaise: number, profitPaise: number): number {
  if (!revenuePaise || revenuePaise <= 0) return 0
  const ratio = (profitPaise / revenuePaise) * 100
  return Number(Math.max(-100, Math.min(100, ratio)).toFixed(1))
}

// Backwards compatibility aliases
export const centsToDollars = paiseToRupees
export const dollarsToCents = rupeesToPaise
export const formatMoney = formatINR
export const centsToTabular = paiseToTabular
