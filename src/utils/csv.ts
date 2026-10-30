/**
 * StorePoint CSV Utility
 * Compliant with RFC-4180 with robust formula injection protection.
 * Protects against CSV injection when files are opened in Excel, Google Sheets, or LibreOffice.
 */

/**
 * Characters that trigger formula execution in spreadsheet applications if present at the start of a cell
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

/**
 * Safely format and escape an individual cell value for CSV output
 */
export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }

  // Handle numbers and booleans directly
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '""'
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  let str = String(value)

  // Formula Injection Protection:
  // If the string starts with any formula character, prefix it with a single quote (')
  // Exception: Valid numeric strings like "-150.00" or "+42" that parse as finite numbers
  const trimmed = str.trim()
  const isNumericString = !isNaN(Number(trimmed)) && trimmed !== ''

  if (!isNumericString && FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`
  }

  // Double up any internal quotes and wrap in quotes if it contains quotes, commas, or newlines
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

export interface CSVExportOptions {
  title?: string
  metadata?: Record<string, string | number>
  headers: string[]
  rows: (string | number | boolean | null | undefined)[][]
  summaryRow?: (string | number | boolean | null | undefined)[]
}

/**
 * Generate a complete, RFC-4180 compliant CSV document string
 */
export function buildCSV(options: CSVExportOptions): string {
  const lines: string[] = []

  // Optional Report Header & Metadata Comment Block
  if (options.title) {
    lines.push(escapeCSVCell(options.title))
  }

  if (options.metadata) {
    for (const [key, val] of Object.entries(options.metadata)) {
      lines.push(`${escapeCSVCell(key)},${escapeCSVCell(val)}`)
    }
    lines.push('') // Empty row separating metadata
  }

  // Table Column Headers
  const headerLine = options.headers.map((h) => escapeCSVCell(h)).join(',')
  lines.push(headerLine)

  // Data Rows
  for (const row of options.rows) {
    const rowLine = row.map((cell) => escapeCSVCell(cell)).join(',')
    lines.push(rowLine)
  }

  // Optional Summary Footer Row
  if (options.summaryRow && options.summaryRow.length > 0) {
    const summaryLine = options.summaryRow.map((cell) => escapeCSVCell(cell)).join(',')
    lines.push(summaryLine)
  }

  return lines.join('\r\n')
}

/**
 * Trigger reliable browser download of a CSV document using a Blob object
 */
export function downloadCSVFile(filename: string, csvContent: string): void {
  // Prepend UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 text (including ₹ symbol) without mojibake
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
