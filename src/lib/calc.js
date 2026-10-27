// Motor de cálculo — reproduz as fórmulas da planilha "Viabilidade_Medicos_NOVO MODELO.xlsx"
import { BASE_FACTOR } from './lists'

const n = (v) => (Number.isFinite(v) ? v : 0)
const has = (v) => Number.isFinite(v) && v !== 0

export function taxes(pr) {
  const iss = Math.max(n(pr.iss1), n(pr.iss2))
  const parts = { iss, pis: n(pr.pis), cofins: n(pr.cofins), csll: n(pr.csll), ir: n(pr.ir) }
  const carga = parts.iss + parts.pis + parts.cofins + parts.csll + parts.ir
  return { ...parts, carga }
}

// Situação por margem (usada em itens, simulador e teste de lance)
export function situacao(margem, min, semCusto) {
  if (semCusto) return { kind: 'pending', label: 'Sem custo' }
  if (margem >= min) return { kind: 'ok', label: 'Viável' }
  if (margem >= 0) return { kind: 'warn', label: 'Atenção' }
  return { kind: 'bad', label: 'Prejuízo' }
}

// ---------- Aba TR ----------
export function computeTrItem(it) {
  const factor = BASE_FACTOR[it.base] ?? 1
  const horas = Number.isFinite(it.qtd) ? it.qtd * n(it.nProf) * factor : 0
  const valorMensal = horas * n(it.valorHora)
  let confere = null
  if (Number.isFinite(it.valorTR) && valorMensal !== 0) {
    const dif = valorMensal - it.valorTR
    confere = Math.abs(dif) < 1 ? { kind: 'ok', label: 'Confere' } : { kind: 'bad', label: 'Dif. ' + dif.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
  }
  return { ...it, horas, valorMensal, confere }
}

// ---------- Cálculo principal ----------
export function compute(p) {
  const P = p.processo
  const pr = p.premissas
  const tx = taxes(pr)
  const carga = tx.carga
  const min = n(pr.margemMin)
  const reajInd = Number.isFinite(pr.reajInd) ? pr.reajInd : n(pr.reajFat)

  const vig = n(P.vigencia)
  const estGlobal = n(P.estimadoGlobal)
  const estMensal = vig ? estGlobal / vig : 0

  // Aba Margem — itens
  let seq = 0
  const itens = p.itens.map((it) => {
    const qtd = n(it.qtd)
    const est = n(it.estUnit)
    const prop = Number.isFinite(it.propUnit) ? it.propUnit : est
    const pagar = n(it.pagarUnit)
    const estMensalItem = qtd * est
    const fat = qtd * prop
    const custo = qtd * pagar
    const trib = fat * carga
    const res = fat - custo - trib
    const margem = fat ? res / fat : null
    const precoMin = pagar ? pagar / (1 - carga - min) : null
    const descMax = precoMin !== null && est ? 1 - precoMin / est : null
    const filled = !!(it.descricao && it.descricao.trim())
    let status = null
    if (filled) {
      if (!pagar) status = { kind: 'pending', label: 'Aguarda pesquisa' }
      else if (margem >= min) status = { kind: 'ok', label: 'Acima do mínimo' }
      else if (margem >= 0) status = { kind: 'warn', label: 'Abaixo do mínimo' }
      else status = { kind: 'bad', label: 'Prejuízo' }
    }
    return { ...it, n: filled ? ++seq : null, filled, qtd, est, prop, pagar, estMensal: estMensalItem, fat, custo, trib, res, margem, precoMin, descMax, status }
  })

  const sum = (k) => itens.reduce((a, b) => a + b[k], 0)
  const totQtd = sum('qtd')
  const totEstMensal = sum('estMensal')
  const fatMensal = sum('fat')
  const custoMensal = sum('custo')
  const tribItens = sum('trib')
  const resItens = sum('res')

  const ind = {
    coord: n(p.indiretos.coord),
    outras: n(p.indiretos.outras),
    adm: n(p.indiretos.adm),
  }
  const indiretoMensal = ind.coord + ind.outras + ind.adm

  const tribMensal = fatMensal * carga
  const resMensal = fatMensal - tribMensal - custoMensal - indiretoMensal
  const margemTotal = fatMensal ? resMensal / fatMensal : 0

  // Limites para a disputa
  const lanceLimiteMensal = custoMensal ? (custoMensal + indiretoMensal) / (1 - carga - min) : null
  const equilibrioMensal = custoMensal ? (custoMensal + indiretoMensal) / (1 - carga) : null
  const descOf = (m) => (m === null || !estMensal ? null : 1 - m / estMensal)
  const limites = {
    estimadoMensal: estMensal,
    estimadoGlobal: estMensal * vig,
    nossoMensal: fatMensal,
    nossoGlobal: fatMensal * vig,
    nossoDesconto: descOf(fatMensal),
    lanceLimiteMensal,
    lanceLimiteGlobal: lanceLimiteMensal !== null ? lanceLimiteMensal * vig : null,
    lanceLimiteDesconto: descOf(lanceLimiteMensal),
    equilibrioMensal,
    equilibrioGlobal: equilibrioMensal !== null ? equilibrioMensal * vig : null,
    equilibrioDesconto: descOf(equilibrioMensal),
  }

  // Confere com o edital
  let confereEdital
  if (!estMensal || !totEstMensal) confereEdital = { kind: 'pending', label: 'Preencher' }
  else if (Math.abs(totEstMensal - estMensal) < 1) confereEdital = { kind: 'ok', label: 'Confere' }
  else confereEdital = { kind: 'bad', label: 'Dif. ' + (totEstMensal - estMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  // Dica de coordenação
  let coordHint = ''
  if (P.quadroCoord === 'Sim') coordHint = 'O quadro já prevê coordenação: não incluir em despesa administrativa.'
  else if (P.trCoord === 'Sim') coordHint = 'O TR indica coordenação: avaliar o custo.'

  // Veredito (Painel)
  const minTxt = (min * 100).toFixed(0).replace('.', ',')
  const mTxt = (margemTotal * 100).toFixed(1).replace('.', ',')
  let verdict
  if (!fatMensal) verdict = { kind: 'pending', title: 'Pendente', text: 'Preencha os itens na aba Margem' }
  else if (!custoMensal) verdict = { kind: 'pending', title: 'Pendente', text: 'Aguardando pesquisa de preço (valor a pagar)' }
  else if (margemTotal >= min) verdict = { kind: 'ok', title: 'Viável', text: `Margem de ${mTxt}%, acima do mínimo de ${minTxt}%` }
  else if (margemTotal >= 0) verdict = { kind: 'warn', title: 'Atenção', text: `Margem de ${mTxt}%, abaixo do mínimo de ${minTxt}%` }
  else verdict = { kind: 'bad', title: 'Inviável', text: `Margem negativa (${mTxt}%): prejuízo` }

  // Contrato atual
  const contratoMensal = n(P.vigContrato) ? n(P.atualValorGlobal) / n(P.vigContrato) : 0
  const vsContrato = contratoMensal ? fatMensal / contratoMensal - 1 : null

  // Concorrentes
  const concorrentes = p.concorrentes.map((c, i) => {
    const g = Number.isFinite(c.valorGlobal) ? c.valorGlobal : null
    const mensal = g !== null && vig ? g / vig : null
    const desconto = g !== null && estGlobal ? 1 - g / estGlobal : null
    const nossaMargem = mensal && custoMensal ? (mensal * (1 - carga) - custoMensal - indiretoMensal) / mensal : null
    return { ...c, pos: i + 1, mensal, desconto, nossaMargem }
  })
  const globais = concorrentes.map((c) => c.valorGlobal).filter((v) => Number.isFinite(v))
  const melhorConcorrente = globais.length ? Math.min(...globais) : null
  const nConcorrentes = p.concorrentes.filter((c) => c.razao && c.razao.trim()).length
  let cobre
  if (melhorConcorrente === null || limites.lanceLimiteGlobal === null) cobre = { kind: 'pending', label: 'Sem dados' }
  else if (limites.lanceLimiteGlobal <= melhorConcorrente) cobre = { kind: 'ok', label: 'Sim, com margem ≥ mínima' }
  else cobre = { kind: 'bad', label: 'Não, sem atingir a margem mínima' }

  // Checklist
  const semValor = itens.filter((i) => i.filled && !i.pagar).length
  const nItens = itens.filter((i) => i.filled).length
  const checklist = [
    { label: 'Consulta ISS confirmada', ...(pr.statusISS === 'Confirmado' ? { kind: 'ok', value: 'OK' } : { kind: 'bad', value: 'Pendente' }) },
    { label: 'Pesquisa de preço concluída', ...(P.statusPesquisa === 'Concluído' ? { kind: 'ok', value: 'OK' } : { kind: 'bad', value: P.statusPesquisa || 'Pendente' }) },
    {
      label: 'Valor a pagar em todos os itens',
      ...(nItens === 0 ? { kind: 'pending', value: 'Sem itens' } : semValor === 0 ? { kind: 'ok', value: 'OK' } : { kind: 'bad', value: `${semValor} item(ns) sem valor` }),
    },
    { label: 'Itens conferem com o estimado do edital', kind: confereEdital.kind, value: confereEdital.label },
    { label: 'Empresa atual identificada', ...(P.atualIdentificada === 'Sim' ? { kind: 'ok', value: 'OK' } : { kind: 'bad', value: 'Pendente' }) },
    {
      label: 'Comitê de precificação',
      ...(P.statusComite === 'Concluído'
        ? { kind: 'ok', value: P.decisao || 'Concluído' }
        : { kind: 'pending', value: P.comiteDataPrevista ? P.comiteDataPrevista.split('-').reverse().join('/') : 'sem data' }),
    },
  ]

  const ctx = { carga, min, vig, estGlobal, custoMensal, indiretoMensal }

  return {
    tx, carga, min, reajInd, vig, estGlobal, estMensal,
    itens, totQtd, horasGlobais: totQtd * vig, totEstMensal, fatMensal, custoMensal, tribItens, resItens,
    ind, indiretoMensal, tribMensal, resMensal, margemTotal,
    limites, confereEdital, coordHint, verdict,
    contratoMensal, vsContrato,
    concorrentes, melhorConcorrente, nConcorrentes, cobre,
    checklist,
    simular: (desconto) => simular(ctx, desconto),
    testarLance: (global) => testarLance(ctx, global),
  }
}

// ---------- Simulador de lances ----------
function simular({ carga, min, vig, estGlobal, custoMensal, indiretoMensal }, desconto) {
  const global = estGlobal * (1 - desconto)
  const mensal = vig ? global / vig : 0
  const trib = mensal * carga
  const custos = custoMensal + indiretoMensal
  const res = mensal - trib - custos
  const margem = mensal ? res / mensal : 0
  const sit = situacao(margem, min, !custoMensal || !mensal)
  return { desconto, global, mensal, trib, custos, res, margem, sit }
}

function testarLance({ carga, min, vig, estGlobal, custoMensal, indiretoMensal }, global) {
  if (!Number.isFinite(global)) return null
  const desconto = estGlobal ? 1 - global / estGlobal : null
  const mensal = vig ? global / vig : null
  const res = mensal !== null ? mensal * (1 - carga) - custoMensal - indiretoMensal : null
  const margem = mensal ? res / mensal : null
  const sit = custoMensal ? situacao(margem, min, false) : { kind: 'pending', label: 'Sem custo' }
  return { global, desconto, mensal, res, margem, sit }
}

export function descontosLista(passo, ate) {
  const step = passo > 0 ? passo : 0.025
  const max = ate > 0 ? Math.min(ate, 1) : 0.4
  const out = []
  for (let i = 0; i * step <= max + 1e-9 && out.length < 200; i++) out.push(Math.round(i * step * 1e6) / 1e6)
  return out
}

// ---------- Projeção 12 meses e 10 anos ----------
export function projecao(p, c) {
  const pr = p.premissas
  const rf = n(pr.reajFat)
  const rm = n(pr.reajMed)
  const ri = c.reajInd

  let start
  if (p.processo.inicioContrato) {
    const [y, m] = p.processo.inicioContrato.split('-').map(Number)
    start = new Date(y, m - 1, 1)
  } else {
    const t = new Date()
    start = new Date(t.getFullYear(), t.getMonth() + 1, 1)
  }
  const meses = Array.from({ length: 12 }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1))

  const line = (label, mensal, reaj, opts = {}) => {
    const months = Array(12).fill(mensal)
    const years = Array.from({ length: 10 }, (_, k) => mensal * 12 * Math.pow(1 + reaj, k))
    return { label, months, years, total: years.reduce((a, b) => a + b, 0), ...opts }
  }

  const fat = line('Faturamento', c.fatMensal, rf, { strong: true })
  const taxLine = (label, rate) => {
    const months = fat.months.map((v) => v * rate)
    const years = fat.years.map((v) => v * rate)
    return { label, months, years, total: years.reduce((a, b) => a + b, 0), group: 'trib' }
  }
  const tribs = [
    taxLine('(−) ISS', c.tx.iss),
    taxLine('(−) PIS', c.tx.pis),
    taxLine('(−) COFINS', c.tx.cofins),
    taxLine('(−) CSLL', c.tx.csll),
    taxLine('(−) IR', c.tx.ir),
  ]
  const addLines = (label, ls, opts) => {
    const months = Array.from({ length: 12 }, (_, i) => ls.reduce((a, l) => a + l.months[i], 0))
    const years = Array.from({ length: 10 }, (_, i) => ls.reduce((a, l) => a + l.years[i], 0))
    return { label, months, years, total: years.reduce((a, b) => a + b, 0), ...opts }
  }
  const totTrib = addLines('(=) Total de tributos', tribs, { strong: true })

  const itens = c.itens.filter((i) => i.filled || i.custo).map((i) => line('   ' + (i.descricao || 'Item sem descrição'), i.custo, rm, { group: 'itens' }))
  const indiretos = [
    line('Coordenação / RT', c.ind.coord, ri),
    line('Outras despesas', c.ind.outras, ri),
    line('Despesas administrativas', c.ind.adm, ri),
  ]
  const custoTotal = addLines('(=) Custo total dos serviços', [...itens, ...indiretos], { strong: true })

  const res = {
    label: '(=) Resultado (taxa de administração)',
    months: fat.months.map((v, i) => v - totTrib.months[i] - custoTotal.months[i]),
    years: fat.years.map((v, i) => v - totTrib.years[i] - custoTotal.years[i]),
    strong: true,
    result: true,
  }
  res.total = res.years.reduce((a, b) => a + b, 0)

  const margem = {
    label: 'Margem',
    months: res.months.map((v, i) => (fat.months[i] ? v / fat.months[i] : 0)),
    years: res.years.map((v, i) => (fat.years[i] ? v / fat.years[i] : 0)),
    isPct: true,
  }
  margem.total = fat.total ? res.total / fat.total : 0

  return { meses, rows: [fat, ...tribs, totTrib, ...itens, ...indiretos, custoTotal, res, margem] }
}
