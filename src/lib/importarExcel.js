// Importa o modelo de viabilidade preenchido (.xlsx) lendo as células da coluna E da planilha de parâmetros
import JSZip from 'jszip'
import { CAMPOS, FORMULA, tipoDe } from '../config/regras.js'
import { parseNumBR, slug, vazio } from './formato.js'
import { validar } from './validacao.js'
import { CAMPOS_DO_CLIENTE_IDS } from './clientes.js'
import { novoId } from './armazenamento.js'
import { grupoItens } from './calculos.js'

export const BLOCOS_IMPORTADOS = ['Processo', 'TR', 'Premissas', 'Margem']
const MAX_LINHAS = 60

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
const textoDe = (xml) => decode([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''))

// Lê o arquivo e devolve { nomeDaAba: { 'C6': { v, f, temFormula } } }
export async function lerPlanilha(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const ler = async (p) => (zip.file(p) ? zip.file(p).async('string') : '')
  const wb = await ler('xl/workbook.xml')
  if (!wb) throw new Error('O arquivo não é uma planilha .xlsx válida.')
  const rels = await ler('xl/_rels/workbook.xml.rels')
  const shared = [...(await ler('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1]))
  const abas = {}
  for (const m of wb.matchAll(/<sheet\b[^>]*?\bname="([^"]+)"[^>]*?\br:id="([^"]+)"/g)) {
    const nome = decode(m[1]), rid = m[2]
    const alvo = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels)
    if (!alvo) continue
    const xml = await ler('xl/' + (alvo[1] || alvo[2]).replace(/^\/?xl\//, '').replace(/^\//, ''))
    const celulas = {}
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], corpo = c[2] || ''
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1]
      if (!ref) continue
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1]
      const vb = /<v>([\s\S]*?)<\/v>/.exec(corpo)?.[1]
      const fm = /<f\b[^>]*?(?:\/>|>([\s\S]*?)<\/f>)/.exec(corpo)
      let v = null
      if (t === 's') v = shared[+vb] ?? null
      else if (t === 'inlineStr') v = textoDe(corpo)
      else if (t === 'str' || t === 'e') v = vb !== undefined ? decode(vb) : null
      else if (t === 'b') v = vb === '1'
      else if (vb !== undefined) v = Number(vb)
      celulas[ref] = { v, f: fm ? decode(fm[1] || '') : null, temFormula: !!fm }
    }
    abas[nome] = celulas
  }
  return abas
}

const serialParaData = (n) => {
  const d = new Date(Math.round((Math.floor(n) - 25569) * 86400000))
  return d.toISOString().slice(0, 10)
}
const fracaoParaHora = (n) => {
  const min = Math.round((n - Math.floor(n)) * 1440) % 1440
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

// Converte o conteúdo de uma célula para o formato padronizado do campo
function converter(campo, cel) {
  if (!cel || vazio(cel.v) || (typeof cel.v === 'string' && !cel.v.trim())) return { vazio: true }
  if (FORMULA(campo) && cel.temFormula) return { automatico: true }
  const t = tipoDe(campo)
  let v = cel.v
  if (typeof v === 'string') v = v.trim()

  if (t === 'data') {
    if (typeof v === 'number') v = serialParaData(v)
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) v = v.split('/').reverse().join('-')
  } else if (t === 'hora') {
    if (typeof v === 'number') v = fracaoParaHora(v)
    else if (/^\d{1,2}:\d{2}/.test(v)) v = v.slice(0, 5).padStart(5, '0')
  } else if (t === 'moeda' || t === 'numero' || t === 'percentual') {
    if (typeof v === 'string') {
      const pct = v.endsWith('%')
      if (v === '-' || v === '–') return { vazio: true }
      v = parseNumBR(v)
      if (pct && isFinite(v)) v = v / 100
    }
  } else if (t === 'moeda-ou-sigiloso') {
    if (typeof v === 'string') v = slug(v) === 'sigiloso' ? 'Sigiloso' : parseNumBR(v)
  } else if (t === 'expressao') {
    const f = (cel.f || '').trim()
    if (cel.temFormula && /^[\d.,+\-*/() ]+$/.test(f)) v = '=' + f
    else if (typeof v === 'number') v = String(Math.round(v * 1e6) / 1e6).replace('.', ',')
  } else if (t === 'lista' || campo.especial === 'uf' || campo.especial === 'capital') {
    const ops = campo.opcoes.length ? campo.opcoes : null
    if (ops) {
      const achada = ops.find((o) => slug(o) === slug(String(v)))
      if (!achada) return { erro: `“${String(v).slice(0, 40)}” não está na lista` }
      v = achada
    } else v = String(v)
  } else {
    v = typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v)
  }
  if (typeof v === 'number' && !isFinite(v)) return { erro: 'valor não numérico' }
  const erro = validar(campo, v)
  return erro ? { erro } : { valor: v }
}

const lerRef = (celula) => {
  const m = /^([A-Z]+)(\d+)(?::[A-Z]+(\d+))?/.exec(celula || '')
  return m ? { col: m[1], linha: +m[2], fim: m[3] ? +m[3] : null } : null
}

export async function importarViabilidade(arrayBuffer, cliente) {
  const abas = await lerPlanilha(arrayBuffer)
  const acharAba = (bloco) => abas[Object.keys(abas).find((n) => slug(n) === slug(bloco))]
  const rel = { importados: 0, automaticos: 0, ignorados: [], avisos: [], itens: 0, abasLidas: [] }
  const valores = {}
  const itensPorBloco = {}

  for (const bloco of BLOCOS_IMPORTADOS) {
    const aba = acharAba(bloco)
    const campos = CAMPOS.filter((c) => c.bloco === bloco)
    if (!campos.length) continue
    if (!aba) { rel.avisos.push(`A aba “${bloco}” não foi encontrada no arquivo.`); continue }
    rel.abasLidas.push(bloco)

    // Campos simples
    for (const c of campos.filter((x) => !x.repete)) {
      const r = lerRef(c.celula)
      if (!r) continue
      const cel = aba[r.col + r.linha]
      if (CAMPOS_DO_CLIENTE_IDS.includes(c.id)) {
        const daPlanilha = cel?.v
        if (cliente && !vazio(daPlanilha) && String(daPlanilha).trim() !== String(cliente.valores?.[c.id] ?? '').trim()) {
          rel.avisos.push(`${c.parametro} na planilha é “${daPlanilha}”; foi mantido o do cliente (“${cliente.valores?.[c.id] ?? '—'}”).`)
        }
        continue
      }
      const res = converter(c, cel)
      if (res.automatico) rel.automaticos++
      else if (res.erro) rel.ignorados.push({ bloco, parametro: c.parametro, celula: `${bloco}!${c.celula}`, motivo: res.erro })
      else if (!res.vazio) { valores[c.id] = res.valor; rel.importados++ }
    }

    // Campos por linha (itens): lê da linha inicial até a primeira linha vazia ou de TOTAL
    const repet = campos.filter((x) => x.repete && x.grupo === grupoItens)
    if (repet.length) {
      const refs = repet.map((c) => ({ c, r: lerRef(c.celula) })).filter((x) => x.r)
      const chave = refs[0]
      const linhas = []
      for (let i = 0; i < MAX_LINHAS; i++) {
        const lin = chave.r.linha + i
        if (chave.r.fim && lin > chave.r.fim) break
        const v = aba[chave.r.col + lin]?.v
        if (vazio(v) || (typeof v === 'string' && (!v.trim() || /^total/i.test(v.trim())))) break
        const item = {}
        for (const { c, r } of refs) {
          const res = converter(c, aba[r.col + lin])
          if (res.automatico) rel.automaticos++
          else if (res.erro) rel.ignorados.push({ bloco, parametro: c.parametro, celula: `${bloco}!${r.col}${lin}`, motivo: res.erro })
          else if (!res.vazio) { item[c.id] = res.valor; rel.importados++ }
        }
        linhas.push(item)
      }
      itensPorBloco[bloco] = linhas
    }
  }

  // TR e Margem formam a mesma lista de itens, casados pela ordem das linhas
  const qtd = Math.max(0, ...Object.values(itensPorBloco).map((l) => l.length))
  const itens = Array.from({ length: qtd }, (_, i) =>
    Object.assign({ _id: novoId() }, ...Object.values(itensPorBloco).map((l) => l[i] || {})),
  )
  const tr = itensPorBloco.TR?.length, mg = itensPorBloco.Margem?.length
  if (tr !== undefined && mg !== undefined && tr !== mg) rel.avisos.push(`A aba TR tem ${tr} item(ns) e a Margem tem ${mg}; os itens foram casados pela ordem das linhas.`)
  rel.itens = qtd

  // Descrição na Margem igual ao TR fica automática (segue o TR)
  const desc = CAMPOS.find((c) => c.bloco === 'Margem' && c.slug.startsWith('descricao'))
  const prof = CAMPOS.find((c) => c.bloco === 'TR' && c.slug.startsWith('profissional'))
  if (desc && prof) for (const it of itens) if (it[desc.id] && it[desc.id] === it[prof.id]) delete it[desc.id]

  if (!rel.abasLidas.length) throw new Error('Nenhuma das abas Processo, TR, Premissas ou Margem foi encontrada. Confira se é o modelo de viabilidade.')
  return { valores, grupos: { [grupoItens]: itens }, relatorio: rel }
}
