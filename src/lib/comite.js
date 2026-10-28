// O comitê de precificação acontece às terças e quintas.
// Sugestão: a última terça ou quinta ANTES do dia da disputa.
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
export const DIAS_COMITE = [2, 4] // terça, quinta

const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function sugerirDataComite(dataSessaoISO) {
  const sessao = fromISO(dataSessaoISO)
  if (!sessao) return null
  const d = new Date(sessao)
  for (let i = 0; i < 7; i++) {
    d.setDate(d.getDate() - 1)
    if (DIAS_COMITE.includes(d.getDay())) return toISO(d)
  }
  return null
}

export function diaSemana(iso) {
  const d = fromISO(iso)
  return d ? DIAS[d.getDay()] : ''
}

export function dataLonga(iso) {
  const d = fromISO(iso)
  if (!d) return ''
  return `${DIAS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function isPast(iso) {
  const d = fromISO(iso)
  if (!d) return false
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return d < t
}

// Aplica um patch na aba Processo mantendo a data do comitê sincronizada com a sessão,
// enquanto ela não tiver sido alterada manualmente.
export function patchProcesso(processo, patch) {
  const next = { ...processo, ...patch }
  if ('comiteDataPrevista' in patch && !('_comiteAuto' in patch)) next.comiteAuto = false
  delete next._comiteAuto
  if ('dataSessao' in patch) {
    const sug = sugerirDataComite(next.dataSessao)
    const auto = processo.comiteAuto !== false || !processo.comiteDataPrevista
    if (sug && auto) {
      next.comiteDataPrevista = sug
      next.comiteAuto = true
    }
  }
  return next
}
