const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const ok = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(v)

export const money = (v) => (ok(v) ? brl.format(v) : '—')
export const money0 = (v) => (ok(v) ? brl0.format(v) : '—')

export const num = (v, d = 2) =>
  ok(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'

export const pct = (v, d = 2) => (ok(v) ? num(v * 100, d) + '%' : '—')

export const pctSigned = (v, d = 1) => (ok(v) ? (v > 0 ? '+' : '') + num(v * 100, d) + '%' : '—')

export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

// Converte texto digitado em pt-BR ("1.234,56", "12,5", "R$ 3.000") em número
export function parseBR(input) {
  if (input === null || input === undefined) return null
  let s = String(input).trim().replace(/[R$\s%]/g, '')
  if (!s || s === '-' || s === ',') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Valor para exibição dentro de um campo em edição (sem símbolo de moeda)
export function toEditText(v, decimals = 2, minDecimals = 0) {
  if (!ok(v)) return ''
  return v.toLocaleString('pt-BR', { minimumFractionDigits: minDecimals, maximumFractionDigits: decimals })
}
