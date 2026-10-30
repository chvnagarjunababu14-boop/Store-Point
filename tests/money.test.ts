import { describe, it, expect } from 'vitest'
import {
  paiseToRupees,
  rupeesToPaise,
  formatINR,
  paiseToTabular,
  calculateMarginPercent,
  formatMoney,
  centsToDollars,
  dollarsToCents,
} from '@/utils/money'

describe('Indian Currency & Integer Paise Utilities', () => {
  it('converts integer paise to rupee floating values accurately', () => {
    expect(paiseToRupees(1)).toBe(0.01)
    expect(paiseToRupees(12550)).toBe(125.5)
    expect(paiseToRupees(10000000)).toBe(100000.0)
    expect(paiseToRupees(0)).toBe(0)
  })

  it('safely parses rupee numbers and strings into integer paise without IEEE-754 errors', () => {
    expect(rupeesToPaise(0.01)).toBe(1)
    expect(rupeesToPaise(125.5)).toBe(12550)
    expect(rupeesToPaise(100000.0)).toBe(10000000)
    expect(rupeesToPaise('₹0.01')).toBe(1)
    expect(rupeesToPaise('₹125.50')).toBe(12550)
    expect(rupeesToPaise('₹1,00,000.00')).toBe(10000000)
    expect(rupeesToPaise('  100000 ')).toBe(10000000)
  })

  it('formats amounts correctly in en-IN locale with Indian numbering (₹0.01, ₹125.50, ₹1,00,000.00)', () => {
    // Exact requested test cases:
    expect(formatINR(1)).toBe('₹0.01')
    expect(formatINR(12550)).toBe('₹125.50')
    expect(formatINR(10000000)).toBe('₹1,00,000.00')

    // Additional Indian numbering scale tests:
    // Ten Lakhs: 10,00,000.00
    expect(formatINR(100000000)).toBe('₹10,00,000.00')
    // One Crore: 1,00,00,000.00
    expect(formatINR(1000000000)).toBe('₹1,00,00,000.00')

    // Sign handling
    expect(formatINR(12550, { showSign: true })).toBe('+₹125.50')
    expect(formatINR(-12550)).toBe('-₹125.50')
  })

  it('formats compact Indian currency representations', () => {
    // 50 Thousand -> 50.0k
    expect(formatINR(5000000, { compact: true })).toBe('₹50.0k')
    // 2.5 Lakhs -> 2.50 L
    expect(formatINR(25000000, { compact: true })).toBe('₹2.50 L')
    // 1.5 Crores -> 1.50 Cr
    expect(formatINR(1500000000, { compact: true })).toBe('₹1.50 Cr')
  })

  it('formats tabular numbers in en-IN without currency symbols', () => {
    expect(paiseToTabular(1)).toBe('0.01')
    expect(paiseToTabular(12550)).toBe('125.50')
    expect(paiseToTabular(10000000)).toBe('1,00,000.00')
  })

  it('calculates profit margin percentage safely', () => {
    expect(calculateMarginPercent(10000, 5000)).toBe(50)
    expect(calculateMarginPercent(10000000, 2500000)).toBe(25)
    expect(calculateMarginPercent(0, 100)).toBe(0)
  })

  it('retains 100% backwards compatibility with legacy cents/dollars aliases', () => {
    expect(centsToDollars(12550)).toBe(125.5)
    expect(dollarsToCents('125.50')).toBe(12550)
    expect(formatMoney(10000000)).toBe('₹1,00,000.00')
  })
})
