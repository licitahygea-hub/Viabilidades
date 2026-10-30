// Conversões e formatos no padrão brasileiro

export const slug = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const nfMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const nfNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export const vazio = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

export function fmtMoeda(v) {
  return typeof v === 'number' && isFinite(v) ? nfMoeda.format(v) : '—'
}
export function fmtMoedaCurta(v) {
  if (typeof v !== 'number' || !isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e6) return 'R$ ' + nfNum.format(v / 1e6) + ' mi'
  if (a >= 1e3) return 'R$ ' + nfNum.format(v / 1e3) + ' mil'
  return nfMoeda.format(v)
}
export function fmtNum(v, casas = 2) {
  return typeof v === 'number' && isFinite(v)
    ? v.toLocaleString('pt-BR', { maximumFractionDigits: casas })
    : '—'
}
export function fmtPct(v, casas = 2) {
  return typeof v === 'number' && isFinite(v)
    ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%'
    : '—'
}
export function fmtData(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// "1.234,56" | "1234.56" | "1234,5" → número; texto inválido → NaN
export function parseNumBR(txt) {
  if (typeof txt === 'number') return txt
  let s = String(txt ?? '').trim().replace(/^R\$\s*/i, '').replace(/%$/, '').trim()
  if (!s) return NaN
  if (!/^-?[\d.,\s]+$/.test(s)) return NaN
  s = s.replace(/\s/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  const n = Number(s)
  return isFinite(n) ? n : NaN
}

// Avalia "=2920/12" ou "243,33". Aceita apenas números, + - * / ( ) e vírgula decimal.
export function avaliarExpressao(txt) {
  const s = String(txt ?? '').trim()
  if (!s) return NaN
  if (!s.startsWith('=')) return parseNumBR(s)
  const expr = s.slice(1).replace(/\s/g, '').replace(/(\d)\.(?=\d{3}\b)/g, '$1').replace(/,/g, '.')
  if (!/^[\d.+\-*/()]+$/.test(expr)) return NaN
  try {
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict";return (${expr})`)()
    return typeof r === 'number' && isFinite(r) ? r : NaN
  } catch {
    return NaN
  }
}

export function mascaraCNPJ(v) {
  const d = String(v ?? '').replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function cnpjValido(v) {
  const d = String(v ?? '').replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (n) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = pesos.reduce((acc, p, i) => acc + p * +d[i], 0)
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === +d[12] && calc(13) === +d[13]
}
