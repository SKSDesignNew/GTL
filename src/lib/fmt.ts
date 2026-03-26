/**
 * Shared formatting utilities — single source of truth for all amounts in AuditQens
 *
 * Rules:
 *  - Summary cards / KPIs  → fmtShort()   e.g. $138.5M  $42.3K
 *  - Detail table rows     → fmtFull()    e.g. $138,514,751.04
 *  - Trial balance         → fmtAcct()    e.g. $138,514,751.04  or  ($138,514,751.04) for negatives
 *  - Negatives everywhere  → wrapped in () in red, never with a minus sign
 */

export function fmtShort(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(v)) return '—'
  const abs = Math.abs(v)
  const str =
    abs >= 1_000_000 ? '$' + (abs / 1_000_000).toFixed(2) + 'M' :
    abs >= 1_000     ? '$' + (abs / 1_000).toFixed(1) + 'K' :
                       '$' + abs.toFixed(2)
  return v < 0 ? '(' + str + ')' : str
}

export function fmtFull(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(v)) return '—'
  const abs = Math.abs(v)
  const str = '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v < 0 ? '(' + str + ')' : str
}

/** Same as fmtFull but returns { text, negative } for colour coding */
export function fmtAcct(n: number | string | null | undefined): { text: string; negative: boolean } {
  if (n === null || n === undefined || n === '') return { text: '—', negative: false }
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(v)) return { text: '—', negative: false }
  const abs = Math.abs(v)
  const str = '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return { text: v < 0 ? '(' + str + ')' : str, negative: v < 0 }
}

export function fmtCount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}
