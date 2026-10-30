// Cálculos do modelo de viabilidade (mesmas regras da planilha Margem Médicos)
import { CAMPOS, UFS, acharCampo } from '../config/regras.js'
import { avaliarExpressao, parseNumBR, vazio } from './formato.js'

const F = {
  // Processo
  municipio: acharCampo('Processo', 'municipio-uf'),
  capital: acharCampo('Processo', 'capital-do-estado'),
  empresa: acharCampo('Processo', 'empresa-participante'),
  edital: acharCampo('Processo', 'n-do-edital'),
  modalidade: acharCampo('Processo', 'modalidade'),
  data: acharCampo('Processo', 'data-da-sessao'),
  hora: acharCampo('Processo', 'horario-da-sessao'),
  objeto: acharCampo('Processo', 'objeto'),
  vigencia: acharCampo('Processo', 'vigencia-meses'),
  estimadoGlobal: acharCampo('Processo', 'valor-estimado-global'),
  decisao: acharCampo('Processo', 'decisao'),
  // TR (por item)
  trProf: acharCampo('TR', 'profissional'),
  trLocal: acharCampo('TR', 'local'),
  trBase: acharCampo('TR', 'base-da-carga'),
  trQtd: acharCampo('TR', 'qtd-informada'),
  trNProf: acharCampo('TR', 'n-de-profissionais'),
  trValorHora: acharCampo('TR', 'valor-hora-estimado'),
  trValorMensal: acharCampo('TR', 'valor-mensal-no-tr'),
  // Premissas
  issCom: acharCampo('Premissas', 'iss-com'),
  issSem: acharCampo('Premissas', 'iss-sem'),
  statusIss: acharCampo('Premissas', 'status-da-consulta-iss'),
  pis: acharCampo('Premissas', 'pis'),
  cofins: acharCampo('Premissas', 'cofins'),
  csll: acharCampo('Premissas', 'csll'),
  ir: acharCampo('Premissas', 'ir'),
  reajFat: acharCampo('Premissas', 'reajuste-do-faturamento'),
  reajMed: acharCampo('Premissas', 'reajuste-do-valor-pago'),
  reajInd: acharCampo('Premissas', 'reajuste-dos-custos-indiretos'),
  margemMin: acharCampo('Premissas', 'margem-minima'),
  // Margem (por item)
  mgDesc: acharCampo('Margem', 'descricao'),
  mgUnidade: acharCampo('Margem', 'unidade'),
  mgQtd: acharCampo('Margem', 'qtd-mes'),
  mgEstimado: acharCampo('Margem', 'valor-unit-estimado'),
  mgProposto: acharCampo('Margem', 'valor-unit-proposto'),
  mgPagar: acharCampo('Margem', 'valor-unit-a-pagar'),
  // Concorrentes (por concorrente)
  ccRazao: acharCampo('Concorrentes', 'razao-social'),
  ccStatus: acharCampo('Concorrentes', 'status'),
  ccGlobal: acharCampo('Concorrentes', 'valor-global'),
}
export const CAMPO = F

// Custos indiretos = campos de moeda da Margem que não se repetem por item
const INDIRETOS = CAMPOS.filter((c) => c.bloco === 'Margem' && !c.repete && /moeda/i.test(c.tipo))

const FATOR_BASE = { 'h/mês': 1, 'h/dia': 365 / 12, 'h/semana': 52 / 12, 'plantões 12h/mês': 12, 'plantões 24h/mês': 24 }
const HORAS_UNIDADE = { Hora: 1, 'Plantão 12h': 12, 'Plantão 24h': 24 }

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' ? parseNumBR(v) : NaN)
const n0 = (v) => (isFinite(num(v)) ? num(v) : 0)

export const valor = (proc, campo) => (campo ? proc.valores?.[campo.id] : undefined)
export const linhas = (proc, grupo) => proc.grupos?.[grupo] || []
export const grupoItens = F.mgDesc?.grupo || F.trProf?.grupo || 'item'
export const grupoConcorrentes = F.ccRazao?.grupo || 'concorrente'

export function ufDe(proc) {
  const m = /\/([A-Z]{2})$/.exec(String(valor(proc, F.municipio) || ''))
  return m ? m[1] : ''
}
export function municipioDe(proc) {
  return String(valor(proc, F.municipio) || '').replace(/\/[A-Z]{2}$/, '').trim()
}

export function analisar(proc) {
  const padroes = {}
  const v = (c) => valor(proc, c)
  const eff = (c, padrao) => (vazio(v(c)) ? padrao : v(c))

  // Capital: automática pela UF do município
  const uf = ufDe(proc)
  if (F.capital && uf) padroes[F.capital.id] = UFS[uf]

  // Tributos
  const iss = Math.max(n0(v(F.issCom)), n0(v(F.issSem)))
  const carga = iss + n0(v(F.pis)) + n0(v(F.cofins)) + n0(v(F.csll)) + n0(v(F.ir))
  const margemMin = n0(v(F.margemMin))
  if (F.reajInd) padroes[F.reajInd.id] = v(F.reajFat)

  // Itens (TR + Margem compartilham a mesma lista)
  const itens = linhas(proc, grupoItens).map((it, i) => {
    const qtdInf = avaliarExpressao(it[F.trQtd?.id])
    const nProf = isFinite(num(it[F.trNProf?.id])) ? num(it[F.trNProf?.id]) : 1
    const fator = FATOR_BASE[it[F.trBase?.id]] ?? 1
    const horasMes = isFinite(qtdInf) ? qtdInf * nProf * fator : 0
    const valorHoraTR = num(it[F.trValorHora?.id])
    const mensalCalcTR = isFinite(valorHoraTR) ? horasMes * valorHoraTR : null
    const mensalTR = num(it[F.trValorMensal?.id])

    const descricao = vazio(it[F.mgDesc?.id]) ? it[F.trProf?.id] || '' : it[F.mgDesc.id]
    if (F.mgDesc) padroes[`${F.mgDesc.id}#${it._id}`] = it[F.trProf?.id] || ''
    if (F.mgQtd) padroes[`${F.mgQtd.id}#${it._id}`] = horasMes || ''
    const qtd = vazio(it[F.mgQtd?.id]) ? horasMes : n0(it[F.mgQtd.id])
    const estRaw = it[F.mgEstimado?.id]
    const sigiloso = estRaw === 'Sigiloso'
    const estimado = sigiloso ? 0 : n0(estRaw)
    const proposto = n0(it[F.mgProposto?.id])
    const pagar = n0(it[F.mgPagar?.id])
    const unidade = it[F.mgUnidade?.id] || 'Hora'

    const fat = qtd * proposto
    const custo = qtd * pagar
    const trib = fat * carga
    const resultado = fat - custo - trib
    const margem = fat ? resultado / fat : null
    const precoMin = pagar && 1 - carga - margemMin > 0 ? pagar / (1 - carga - margemMin) : null
    const descMax = precoMin && estimado ? 1 - precoMin / estimado : null
    let status = 'Aguarda pesquisa'
    if (pagar) status = margem === null ? 'Sem preço' : margem >= margemMin ? 'Acima do mínimo' : margem >= 0 ? 'Abaixo do mínimo' : 'Prejuízo'
    const horasUn = HORAS_UNIDADE[unidade]
    const valorHora = proposto && horasUn ? proposto / horasUn : null

    return {
      _id: it._id, n: i + 1, descricao, local: it[F.trLocal?.id] || '', unidade,
      horasMes, mensalCalcTR, mensalTR: isFinite(mensalTR) ? mensalTR : null,
      qtd, estimado, sigiloso, estimadoMensal: qtd * estimado, proposto, pagar, valorHora,
      fat, custo, trib, resultado, margem, precoMin, descMax, status,
    }
  })

  const soma = (k) => itens.reduce((a, it) => a + (it[k] || 0), 0)
  const fat = soma('fat'), custo = soma('custo'), trib = soma('trib')
  const indiretosDet = INDIRETOS.map((c) => ({ campo: c, valor: n0(v(c)) }))
  const indiretos = indiretosDet.reduce((a, d) => a + d.valor, 0)
  const resultado = fat - trib - custo - indiretos
  const margem = fat ? resultado / fat : null

  const estimadoMensal = soma('estimadoMensal')
  if (F.estimadoGlobal) padroes[F.estimadoGlobal.id] = estimadoMensal ? estimadoMensal * 12 : ''
  const estimadoGlobal = n0(eff(F.estimadoGlobal, estimadoMensal * 12))
  const vigencia = n0(v(F.vigencia)) || 12
  const valorGlobal = fat * vigencia

  const custoTotal = custo + indiretos
  const lanceLimiteMensal = custoTotal && 1 - carga - margemMin > 0 ? custoTotal / (1 - carga - margemMin) : null
  const equilibrioMensal = custoTotal && 1 - carga > 0 ? custoTotal / (1 - carga) : null
  const estimadoMensalEf = estimadoGlobal / 12

  let situacao = 'Sem dados'
  if (fat && custo) situacao = margem >= margemMin ? 'Viável' : margem >= 0 ? 'Atenção' : 'Inviável'

  const concorrentes = linhas(proc, grupoConcorrentes)
  const vencedor = concorrentes.find((c) => c[F.ccStatus?.id] === 'Vencedor')

  return {
    padroes, iss, carga, margemMin, itens, fat, custo, trib, indiretos, indiretosDet, resultado, margem,
    estimadoMensal, estimadoGlobal, vigencia, valorGlobal, situacao,
    lanceLimiteMensal, lanceLimiteGlobal: lanceLimiteMensal && lanceLimiteMensal * vigencia,
    equilibrioMensal, equilibrioGlobal: equilibrioMensal && equilibrioMensal * vigencia,
    descontoOfertado: estimadoMensalEf && fat ? 1 - fat / estimadoMensalEf : null,
    descontoMaximo: estimadoMensalEf && lanceLimiteMensal ? 1 - lanceLimiteMensal / estimadoMensalEf : null,
    arrematante: vencedor ? vencedor[F.ccRazao?.id] || 'Vencedor sem razão social' : null,
    uf, municipio: municipioDe(proc),
  }
}

// Valor efetivo de um campo (o informado ou o padrão calculado)
export function efetivo(proc, analise, campo, linha) {
  const bruto = linha ? linha[campo.id] : proc.valores?.[campo.id]
  if (!vazio(bruto)) return { valor: bruto, padrao: false }
  const p = analise.padroes[linha ? `${campo.id}#${linha._id}` : campo.id]
  return { valor: vazio(p) ? bruto : p, padrao: !vazio(p) }
}

export function rotuloProcesso(proc) {
  const m = valor(proc, F.municipio) || 'Novo processo'
  const e = valor(proc, F.edital)
  return e ? `${m} · ${String(e).split('·')[0].trim()}` : m
}
