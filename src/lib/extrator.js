// Leitura do edital por regras (sem IA e sem custo).
// Procura padrões no texto extraído dos PDFs/DOCX e devolve, para cada campo da aba Processo,
// o valor encontrado e a fonte: arquivo, página e trecho literal.
import { CFM_ESPECIALIDADES, ALIAS } from './especialidades'

// ---------- Texto ----------
// Versão "dobrada" do texto (minúsculas, sem acentos, espaços colapsados) com mapa de posições
function dobrar(texto) {
  const out = []
  const map = []
  let prevSpace = true
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (/\s/.test(ch)) {
      if (!prevSpace) {
        out.push(' ')
        map.push(i)
        prevSpace = true
      }
      continue
    }
    let f = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (f.length !== 1) f = ch.toLowerCase().length === 1 ? ch.toLowerCase() : ' '
    out.push(f)
    map.push(i)
    prevSpace = false
  }
  return { fold: out.join(''), map }
}

function corpus(docs) {
  const peso = (n) => (/edital/i.test(n) ? 0 : /termo|refer|\btr\b|anexo i\b|anexo 1\b/i.test(n) ? 1 : 2)
  const ordenados = [...docs].sort((a, b) => peso(a.nome) - peso(b.nome))
  const pages = []
  for (const d of ordenados) {
    for (const p of d.paginas || []) {
      if (!p.texto) continue
      const { fold, map } = dobrar(p.texto)
      pages.push({ arquivo: d.nome, n: p.n, texto: p.texto, fold, map, doc: pages.length && pages[pages.length - 1].arquivo === d.nome ? pages[pages.length - 1].doc : pages.length })
    }
  }
  // índice da página dentro do próprio documento (para limitar buscas às primeiras páginas)
  let atual = null
  let k = 0
  for (const pg of pages) {
    if (pg.arquivo !== atual) {
      atual = pg.arquivo
      k = 0
    }
    pg.k = k++
  }
  return pages
}

function trechoDe(pg, ini, fim, margem = 70) {
  const a = pg.map[Math.max(0, ini - margem)] ?? 0
  const bIdx = Math.min(pg.map.length - 1, fim + margem)
  const b = (pg.map[bIdx] ?? pg.texto.length - 1) + 1
  let t = pg.texto.slice(a, b).replace(/\s+/g, ' ').trim()
  if (a > 0) t = '…' + t
  if (b < pg.texto.length) t += '…'
  return t.slice(0, 260)
}

function original(pg, ini, fim) {
  const a = pg.map[ini]
  const b = (pg.map[Math.min(fim, pg.map.length) - 1] ?? a) + 1
  return pg.texto.slice(a, b).replace(/\s+/g, ' ').trim()
}

function fonte(pg, ini, fim, margem = 70) {
  return { origem: 'documento', arquivo: pg.arquivo, pagina: pg.n, trecho: trechoDe(pg, ini, fim, margem) }
}

// Todas as ocorrências de uma regex (sobre o texto dobrado)
function* ocorrencias(pages, re, { maxK = Infinity, soPrimeiroDoc = false } = {}) {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g'
  const primeiro = pages[0]?.arquivo
  for (const pg of pages) {
    if (pg.k >= maxK) continue
    if (soPrimeiroDoc && pg.arquivo !== primeiro) continue
    const r = new RegExp(re.source, flags)
    let m
    while ((m = r.exec(pg.fold))) {
      yield { pg, m, ini: m.index, fim: m.index + m[0].length }
      if (m[0].length === 0) r.lastIndex++
    }
  }
}

function primeira(pages, re, opts) {
  for (const o of ocorrencias(pages, re, opts)) return o
  return null
}

// Frase (entre pontos finais) que contém a posição
function frase(pg, ini, fim, max = 420) {
  let a = ini
  while (a > 0 && ini - a < max / 2 && !/[.;!?]/.test(pg.fold[a - 1])) a--
  let b = fim
  while (b < pg.fold.length && b - fim < max / 2 && !/[.;!?]/.test(pg.fold[b])) b++
  return { txt: pg.fold.slice(a, b), a, b }
}

// ---------- Tabelas de apoio ----------
const UFS = {
  AC: ['acre', 'Rio Branco'], AL: ['alagoas', 'Maceió'], AP: ['amapa', 'Macapá'], AM: ['amazonas', 'Manaus'], BA: ['bahia', 'Salvador'],
  CE: ['ceara', 'Fortaleza'], DF: ['distrito federal', 'Brasília'], ES: ['espirito santo', 'Vitória'], GO: ['goias', 'Goiânia'],
  MA: ['maranhao', 'São Luís'], MT: ['mato grosso', 'Cuiabá'], MS: ['mato grosso do sul', 'Campo Grande'], MG: ['minas gerais', 'Belo Horizonte'],
  PA: ['para', 'Belém'], PB: ['paraiba', 'João Pessoa'], PR: ['parana', 'Curitiba'], PE: ['pernambuco', 'Recife'], PI: ['piaui', 'Teresina'],
  RJ: ['rio de janeiro', 'Rio de Janeiro'], RN: ['rio grande do norte', 'Natal'], RS: ['rio grande do sul', 'Porto Alegre'],
  RO: ['rondonia', 'Porto Velho'], RR: ['roraima', 'Boa Vista'], SC: ['santa catarina', 'Florianópolis'], SP: ['sao paulo', 'São Paulo'],
  SE: ['sergipe', 'Aracaju'], TO: ['tocantins', 'Palmas'],
}
const UF_POR_NOME = Object.fromEntries(Object.entries(UFS).map(([s, [n]]) => [n, s]))
const UF_RE = Object.keys(UFS).join('|').toLowerCase()

const MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 }
const NUM_EXT = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, dezoito: 18,
  vinte: 20, 'vinte e quatro': 24, trinta: 30, 'trinta e seis': 36, 'quarenta e oito': 48, sessenta: 60,
}

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o'])
function titulo(s) {
  return s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && MINUSCULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\b(Upa|Ubs|Usf|Caps|Samu|Uti|Psf|Sus|Ii|Iii|Iv)\b/g, (m) => m.toUpperCase())
}

const pad = (n) => String(n).padStart(2, '0')
const anoOk = (y) => y >= 2020 && y <= 2040

function lerData(s) {
  let m = s.match(/(\d{1,2})\s?[/.\-]\s?(\d{1,2})\s?[/.\-]\s?(\d{4}|\d{2})\b/)
  if (m) {
    const d = +m[1]
    const mo = +m[2]
    let y = +m[3]
    if (y < 100) y += 2000
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && anoOk(y)) return { iso: `${y}-${pad(mo)}-${pad(d)}`, idx: m.index, len: m[0].length }
  }
  m = s.match(/(\d{1,2})(?:º|°|o)?\s?de\s?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s?de\s?(\d{4})/)
  if (m && anoOk(+m[3])) return { iso: `${m[3]}-${pad(MESES[m[2]])}-${pad(+m[1])}`, idx: m.index, len: m[0].length }
  return null
}

function lerHora(s) {
  const m = s.match(/(?:^|[^\d/.,])([01]?\d|2[0-3])\s?(?:h(?:oras?|rs?)?\s?(?:e\s)?([0-5]\d)?(?:min)?|:([0-5]\d))(?![\d/])/)
  if (!m) return null
  const mm = m[2] || m[3] || '00'
  return `${pad(+m[1])}:${mm}`
}

const dinheiro = (s) => {
  const v = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

// ---------- Detectores Sim/Não ----------
const NEG = /\bnao (?:sera|serao|e|sao|podera|poderao|se|ha|havera|caber[ao]?)\b[^.]{0,40}?\b(?:permitid|admitid|aceit|exigid|necessari|obrigatori|possivel)|\bvedad[ao]s?\b|\bproibid|\bimpedid|\bnao se admit|\bnao se exig|\bdispensad|\binexigivel|\bnao participar|\bnao poderao participar|\bnao podera participar/
const POS = /\b(?:sera|serao|e|sao)\s(?:permitid|admitid|aceit|exigid|obrigatori|necessari)|\bpoder[aã]o? participar|\bdever[aã]o? (?:apresentar|prestar|recolher|ser prestada)|\bexige-se\b|\bexigir[aá]\b|\bficar[aá]? obrigad|\bprestar[aá] garantia|\bmediante garantia|\bpermite-se\b|\badmite-se\b/

function simNao(pages, termo, { soFrase } = {}) {
  let achado = null
  for (const o of ocorrencias(pages, termo)) {
    const f = frase(o.pg, o.ini, o.fim)
    if (soFrase && !soFrase.test(f.txt)) continue
    const neg = NEG.test(f.txt)
    const pos = POS.test(f.txt)
    if (neg || pos) return { valor: neg ? 'Não' : 'Sim', ...fonte(o.pg, f.a + 1, f.b, 0), _frase: f.txt }
    if (!achado) achado = o
  }
  return null
}

function quemFornece(pages, termo, contexto) {
  for (const o of ocorrencias(pages, termo)) {
    const f = frase(o.pg, o.ini, o.fim)
    if (contexto && !contexto.test(f.txt)) continue
    if (!/fornec|disponibiliz|custe|arcar|responsab|providenci|ofere|garantir/.test(f.txt)) continue
    const ctda = [...f.txt.matchAll(/contratad[ao]/g)].map((m) => Math.abs(m.index + f.a - o.ini))
    const ctte = [...f.txt.matchAll(/contratante|municipio|prefeitura|secretaria/g)].map((m) => Math.abs(m.index + f.a - o.ini))
    if (!ctda.length && !ctte.length) continue
    const v = !ctte.length || (ctda.length && Math.min(...ctda) <= Math.min(...ctte)) ? 'Contratada' : 'Contratante'
    return { valor: v, ...fonte(o.pg, f.a + 1, f.b, 0) }
  }
  return null
}

// ---------- Campos ----------
const SIGLA = {
  'Pregão Eletrônico': 'PE', 'Pregão Presencial': 'PP', Concorrência: 'CC', 'Dispensa de Licitação': 'DL', Emergencial: 'EM',
  Credenciamento: 'CR', 'Coleta de Preço': 'CP', 'Tomada de Preço': 'TP',
}

function orgaoEMunicipio(pages) {
  const re = /\b(prefeitura municipal|prefeitura|municipio|fundo municipal de saude|secretaria municipal de saude|camara municipal|consorcio (?:intermunicipal|publico)[a-z ]{0,40}?) d(?:e|a|o|as|os) ([a-z][a-z' -]{2,45})/
  let melhor = null
  for (const o of ocorrencias(pages, re, { maxK: 4 })) {
    let nome = o.m[2].split(/ (?:estado|cnpj|secretaria|fundo|comissao|agente|pregao|edital|processo|aviso|uasg|av|rua|praca|-)\b/)[0].trim()
    nome = nome.replace(/ (?:e|do|da|de)$/, '').trim()
    if (nome.length < 3 || /^(saude|licitac|contrat|compras|administra|governo)/.test(nome)) continue
    const fimNome = o.ini + o.m[0].indexOf(o.m[2]) + nome.length
    melhor = { o, nome, fimNome, tipo: o.m[1] }
    break
  }
  if (!melhor) return {}
  const { o, nome, fimNome } = melhor
  const orgaoTxt = original(o.pg, o.ini, fimNome)
  const out = { orgao: { valor: titulo(orgaoTxt), ...fonte(o.pg, o.ini, fimNome) } }

  // UF: "Cidade/UF", "Cidade - UF", "Estado de ..."
  let uf = null
  let fUf = null
  const reCidUf = new RegExp(`${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s?(?:[/-]|–)\\s?(${UF_RE})\\b`)
  const ou = primeira(pages, reCidUf, { maxK: 6 })
  if (ou) {
    uf = ou.m[1].toUpperCase()
    fUf = fonte(ou.pg, ou.ini, ou.fim)
  } else {
    const oe = primeira(pages, new RegExp(`estado d[eoa] (${Object.keys(UF_POR_NOME).sort((a, b) => b.length - a.length).join('|')})\\b`), { maxK: 4 })
    if (oe) {
      uf = UF_POR_NOME[oe.m[1]]
      fUf = fonte(oe.pg, oe.ini, oe.fim)
    }
  }
  const cidade = titulo(original(o.pg, fimNome - nome.length, fimNome))
  out.municipio = { valor: uf ? `${cidade}/${uf}` : cidade, ...(fUf || fonte(o.pg, o.ini, fimNome)) }
  if (uf) out.capital = { valor: UFS[uf][1], origem: 'derivado', arquivo: '', pagina: null, trecho: `Capital de ${uf}` }
  out._cidade = cidade
  out._uf = uf
  return out
}

function modalidadeENumero(pages) {
  const mods = [
    [/pregao eletronico|pregao,? na forma eletronica|pregao \(?forma eletronica/, 'Pregão Eletrônico'],
    [/pregao presencial/, 'Pregão Presencial'],
    [/concorrencia(?: publica| eletronica)?\b/, 'Concorrência'],
    [/credenciamento|chamamento publico/, 'Credenciamento'],
    [/dispensa (?:de licitacao|eletronica)/, 'Dispensa de Licitação'],
    [/tomada de precos/, 'Tomada de Preço'],
    [/coleta de precos|cotacao eletronica/, 'Coleta de Preço'],
  ]
  let mod = null
  for (const [re, nome] of mods) {
    const o = primeira(pages, re, { maxK: 2, soPrimeiroDoc: true })
    if (o && (!mod || o.pg.k < mod.o.pg.k || (o.pg.k === mod.o.pg.k && o.ini < mod.o.ini))) mod = { o, nome }
  }
  if (!mod) {
    const o = primeira(pages, /\bpregao\b/, { maxK: 3 })
    if (o) mod = { o, nome: primeira(pages, /eletronic/, { maxK: 5 }) ? 'Pregão Eletrônico' : 'Pregão Presencial' }
  }
  const out = {}
  if (mod) out.modalidade = { valor: mod.nome, ...fonte(mod.o.pg, mod.o.ini, mod.o.fim) }

  const reNum = /(pregao(?: eletronico| presencial)?|concorrencia(?: eletronica| publica)?|dispensa(?: eletronica| de licitacao)?|credenciamento|chamamento publico|tomada de precos|edital)\s?(?:n\s?[ºo°.]*|numero|no\.?)?\s?[:\-]?\s?(\d(?:[\d.\-]{0,18}\d)?)(?:\s?\/\s?(\d{4}|\d{2})\b)?/
  let on = null
  for (const o of ocorrencias(pages, reNum, { maxK: 3 })) {
    if (!o.m[3] && !/^20\d{2}[.\-]/.test(o.m[2])) continue // número sem ano: provavelmente não é o do edital
    on = o
    break
  }
  const rp = /processo(?: administrativo| licitatorio| adm\.?| n\.?)?\s?(?:n\s?[ºo°.]*|numero)?\s?[:\-]?\s?((?:\d[\d.\-]*\d|\d)\s?[/]\s?\d{2,4})/
  const op = primeira(pages, rp, { maxK: 3 })
  if (on || op) {
    const partes = []
    let num = null
    if (on) {
      const ano = on.m[3] ? (on.m[3].length === 2 ? '20' + on.m[3] : on.m[3]) : ''
      num = { n: on.m[2], ano }
      partes.push(`${SIGLA[mod?.nome] || 'Nº'} ${on.m[2]}${ano ? '/' + ano : ''}`)
    }
    if (op) partes.push(`Processo ${op.m[1].replace(/\s/g, '')}`)
    const ref = on || op
    out.numeroEdital = { valor: partes.join(' – '), ...fonte(ref.pg, ref.ini, ref.fim) }
    if (num) out._num = num
  }
  return out
}

function sessao(pages) {
  const chaves = [
    /abertura da sessao|sessao publica|data da sessao|inicio da sessao/,
    /data (?:de|da) abertura|abertura das propostas|abertura do certame|abertura: /,
    /inicio da disputa|data da disputa|disputa de precos|fase de lances/,
    /realizacao do (?:certame|pregao)|data do certame|data do pregao/,
    /(?:limite|final) (?:para|de) (?:recebimento|envio|cadastramento) das propostas|recebimento das propostas/,
  ]
  for (const ch of chaves) {
    for (const o of ocorrencias(pages, ch, { maxK: 15 })) {
      const janela = o.pg.fold.slice(o.ini, o.fim + 220)
      const d = lerData(janela)
      if (!d) continue
      const fimData = o.ini + d.idx + d.len
      const depois = o.pg.fold.slice(fimData, fimData + 90)
      const antes = o.pg.fold.slice(o.ini, o.ini + d.idx)
      const h = lerHora(depois) || lerHora(antes)
      const out = { dataSessao: { valor: d.iso, ...fonte(o.pg, o.ini, fimData) } }
      if (h) out.horaSessao = { valor: h, ...fonte(o.pg, o.ini, fimData + 40) }
      return out
    }
  }
  return {}
}

function criterio(pages) {
  const tipos = [
    [/menor preco global/, 'Menor Preço Global'],
    [/menor preco (?:por|do) (?:lote|grupo)/, 'Menor Preço por Lote'],
    [/menor preco por item/, 'Menor Preço por Item'],
    [/menor preco unitario/, 'Menor Preço Unitário'],
    [/maior desconto/, 'Maior Desconto'],
    [/tecnica e preco/, 'Técnica e Preço'],
    [/empreitada por (?:preco )?unitario/, 'Empreitada por item unitário'],
  ]
  // preferir o que aparece perto de "critério de julgamento"
  for (const o of ocorrencias(pages, /criterio de julgamento|tipo de licitacao|julgamento:? (?:pelo|por)|tipo:/, { maxK: 10 })) {
    const jan = o.pg.fold.slice(o.ini, o.fim + 160)
    for (const [re, nome] of tipos) {
      const m = jan.match(re)
      if (m) return { tipoLicitacao: { valor: nome, ...fonte(o.pg, o.ini, o.ini + m.index + m[0].length) } }
    }
    if (/menor preco/.test(jan)) return { tipoLicitacao: { valor: 'Menor Preço', ...fonte(o.pg, o.ini, o.fim + 40) } }
  }
  for (const [re, nome] of tipos) {
    const o = primeira(pages, re, { maxK: 6 })
    if (o) return { tipoLicitacao: { valor: nome, ...fonte(o.pg, o.ini, o.fim) } }
  }
  return {}
}

function modoDisputa(pages) {
  const o = primeira(pages, /modo de disputa[^.]{0,80}?(aberto e fechado|fechado e aberto|aberto|fechado)/, { maxK: 20 })
  if (!o) return {}
  const v = o.m[1] === 'fechado e aberto' ? 'Aberto e fechado' : o.m[1] === 'aberto e fechado' ? 'Aberto e fechado' : o.m[1] === 'aberto' ? 'Aberto' : 'Fechado'
  return { modoDisputa: { valor: v, ...fonte(o.pg, o.ini, o.fim) } }
}

function objeto(pages) {
  const re = /(?:tem (?:como|por) objeto|constitui objeto|o objeto (?:da presente|desta|deste|do presente)[a-z ]{0,30}? e|objeto(?: da licitacao| do certame| da contratacao)?\s?:|do objeto\s?\d*[.\s]*\d*\.?\d*)\s?(?:a |o |:)?/
  for (const o of ocorrencias(pages, re, { maxK: 8 })) {
    let ini = o.fim
    // pula "1.1. O objeto da presente licitação é a" quando o cabeçalho "DO OBJETO" vem antes
    const pre = o.pg.fold.slice(ini, ini + 140).match(/^(?:\d+(?:\.\d+)*\.?\s?)?(?:o |a )?(?:objeto|presente)[a-z ]{0,60}?\b(?:e|consiste (?:em|na|no)|sera|constitui)\s(?:a |o |na |no )?/)
    if (pre) ini += pre[0].length
    const resto = o.pg.fold.slice(ini, ini + 600)
    if (resto.length < 40) continue
    let corte = resto.search(/\.\s(?:[0-9]|[a-z]{0,3}\s?\d)|\.\s(?:o |a |as |os |para |conforme |e |em )?(?:valor|prazo|quantidade|especificac|descric)|\.\s*$/)
    if (corte < 40) corte = Math.min(resto.length, 420)
    const fim = ini + Math.min(corte, 420)
    let txt = original(o.pg, ini, fim).replace(/^[:\-–\s]+/, '')
    if (txt.length < 30 || !/servic|contrata|prestac|medic|plant|profission|saude/i.test(txt)) continue
    txt = txt.charAt(0).toUpperCase() + txt.slice(1)
    if (txt === txt.toUpperCase()) txt = txt.charAt(0) + txt.slice(1).toLowerCase()
    return { objeto: { valor: txt.endsWith('.') ? txt : txt + '.', ...fonte(o.pg, o.ini, fim, 0) } }
  }
  return {}
}

function locais(pages) {
  const re = /\b(upa|unidade de pronto atendimento|hospital|maternidade|policlinica|pronto[- ]socorro|pronto atendimento|unidade basica de saude|ubs|usf|unidade de saude da familia|centro de saude|caps|samu|centro de especialidades|centro de parto|unidade mista)\b( [a-z0-9][a-z0-9.' -]{1,70})/
  const cont = new Map()
  for (const pg of pages) {
    const r = new RegExp(re.source, 'g')
    let m
    while ((m = r.exec(pg.fold))) {
    const o = { pg, m, ini: m.index }
    let nome = o.m[2]
      .split(/ (?:com|para|sendo|localizad|situad|que|no municipio|na cidade|em regime|de forma|conforme|e (?:na |no |a |o )?(?:upa|hospital|maternidade|policlinica|ubs|usf|caps|unidade|centro)|e no|e na|onde|cuja|cujo|atraves|mediante|por|pelo|pela|ao|aos|as|nos|nas|-|–)\b|[,;:()]|\s\d{2,}/)[0]
      .trim()
    const fimFrase = nome.search(/[a-z0-9]{4,}\.(?:\s|$)/)
    if (fimFrase >= 0) nome = nome.slice(0, nome.indexOf('.', fimFrase))
    nome = nome.replace(/\.$/, '').replace(/ (?:e|de|da|do|das|dos|no|na|em)$/, '')
    r.lastIndex = o.ini + o.m[1].length + 1 + Math.max(1, nome.length)
    if (nome.length < 3 || /^(municipal|publico|publica|geral|regional|estadual|federal|de referencia|e |da rede|de saude|do municipio)$/.test(nome)) continue
    if (/^(?:de |da |do )?(?:urgencia|emergencia|atendimento|saude|medic|plantao|servic|cada|unidade|contratante|contratada)/.test(nome)) continue
    const fim = o.ini + o.m[1].length + 1 + nome.length
    const key = (o.m[1] + ' ' + nome).replace(/\s+/g, ' ')
    const prev = cont.get(key)
    if (prev) prev.n++
    else cont.set(key, { n: 1, o, fim })
    }
  }
  const top = [...cont.values()].sort((a, b) => b.n - a.n).slice(0, 5)
  const out = {}
  top.forEach((t, i) => {
    out[`local${i + 1}`] = { valor: titulo(original(t.o.pg, t.o.ini, t.fim)), ...fonte(t.o.pg, t.o.ini, t.fim) }
  })
  return out
}

function valorEstimado(pages) {
  const cands = []
  for (const o of ocorrencias(pages, /r\$\s?(\d{1,3}(?:\.\d{3})+,\d{2}|\d{4,},\d{2})/)) {
    const v = dinheiro(o.m[1])
    if (!v || v < 5000) continue
    const antes = o.pg.fold.slice(Math.max(0, o.ini - 170), o.ini)
    let s = 0
    if (/estimad/.test(antes)) s += 4
    if (/global/.test(antes)) s += 3
    if (/total/.test(antes)) s += 2
    if (/maxim|teto|referencia/.test(antes)) s += 1
    if (/valor/.test(antes)) s += 1
    if (/mensal|unitari|por hora|hora|plantao|item \d|lote \d|capital social|patrimonio|garantia|multa/.test(antes.slice(-80))) s -= 4
    if (s <= 1) continue
    cands.push({ o, v, s })
  }
  if (!cands.length) return {}
  cands.sort((a, b) => b.s - a.s || b.v - a.v)
  const c = cands[0]
  return { estimadoGlobal: { valor: c.v, ...fonte(c.o.pg, c.o.ini, c.o.fim) } }
}

function vigenciaRenovacao(pages) {
  const out = {}
  const nums = Object.keys(NUM_EXT).sort((a, b) => b.length - a.length).join('|')
  const re = new RegExp(`(?:vigencia|prazo de (?:execucao|duracao|vigencia|prestacao))[^.]{0,140}?\\b(\\d{1,3}|${nums})\\s?(?:\\(\\s?[a-z ]+\\s?\\)\\s?)?mes(?:es)?\\b`)
  for (const o of ocorrencias(pages, re)) {
    const v = /^\d+$/.test(o.m[1]) ? +o.m[1] : NUM_EXT[o.m[1]]
    if (v >= 1 && v <= 120) {
      out.vigencia = { valor: v, ...fonte(o.pg, o.ini, o.fim) }
      break
    }
  }
  if (!out.vigencia) {
    const oa = primeira(pages, /vigencia[^.]{0,100}?\b(?:1|um) \(?(?:um)?\)? ?ano\b/)
    if (oa) out.vigencia = { valor: 12, ...fonte(oa.pg, oa.ini, oa.fim) }
  }
  for (const o of ocorrencias(pages, /prorrog/)) {
    const f = frase(o.pg, o.ini, o.fim)
    let v = null
    if (/(?:10|dez) \(?(?:dez)?\)? ?anos|art(?:igo|\.)? ?107/.test(f.txt)) v = 'Até 10 anos'
    else if (/(?:5|cinco) \(?(?:cinco)?\)? ?anos|60 \(?(?:sessenta)?\)? ?meses|sessenta meses|art(?:igo|\.)? ?106/.test(f.txt)) v = 'Até 5 anos'
    else if (/(?:24|vinte e quatro) \(?[a-z ]*\)? ?meses/.test(f.txt)) v = 'Até 24 meses'
    else if (/iguais e sucessivos|igual periodo|iguais periodos|periodos sucessivos/.test(f.txt)) v = 'Período por igual'
    if (v && !NEG.test(f.txt)) {
      out.renovacao = { valor: v, ...fonte(o.pg, f.a + 1, f.b, 0) }
      break
    }
  }
  if (!out.renovacao) {
    const oa = primeira(pages, /ata de registro de precos/, { maxK: 3 })
    if (oa) out.renovacao = { valor: 'Ata Reg. Preço', ...fonte(oa.pg, oa.ini, oa.fim) }
  }
  return out
}

function regras(pages) {
  const out = {}
  const put = (k, r) => {
    if (r) {
      const { _frase, ...rest } = r
      out[k] = rest
    }
  }
  put('garantiaProposta', simNao(pages, /garantia (?:de|da) proposta|garantia de participacao/))
  put('garantiaContratual', simNao(pages, /garantia (?:contratual|de execucao|do contrato|da execucao|de cumprimento|contratual)/))
  put('cooperativa', simNao(pages, /\bcooperativas?\b/))
  put('consorcio', simNao(pages, /\b(?:em )?consorcios?\b/, { soFrase: /particip|empresa|licitante/ }))
  put('os', simNao(pages, /organiza(?:cao|coes) socia(?:l|is)\b/))
  put('oscip', simNao(pages, /\boscips?\b|organiza(?:cao|coes) da sociedade civil de interesse publico/))

  const sub = simNao(pages, /subcontrata/)
  if (sub) {
    let v = sub.valor
    if (v === 'Sim' && /parcial/.test(sub._frase)) v = 'Parcial'
    if (/(?:previa|expressa) (?:autorizacao|anuencia)|autorizacao (?:previa|expressa)/.test(sub._frase) && !NEG.test(sub._frase)) v = 'Somente c/ autorização'
    put('subcontratacao', { ...sub, valor: v })
    const pm = sub._frase.match(/(\d{1,3})\s?(?:\(\s?[a-z ]+\s?\)\s?)?(?:%|por cento)/)
    if (pm && +pm[1] <= 100) out.pctSub = { valor: +pm[1], origem: sub.origem, arquivo: sub.arquivo, pagina: sub.pagina, trecho: sub.trecho }
  }

  put('epi', quemFornece(pages, /equipamentos? de protecao individual|\bepis?\b/))
  put('alimentacao', quemFornece(pages, /\balimentacao\b|\brefeic(?:ao|oes)\b/, /profission|medic|plant|equipe|colaborador/))

  const coord = primeira(pages, /coordenad(?:or|ora)(?: medic[oa]| tecnic[oa])?|coordenacao medica|responsavel tecnic[oa]|diretor(?:a)? (?:tecnic|clinic)[oa]/)
  if (coord) out.trCoord = { valor: 'Sim', ...fonte(coord.pg, coord.ini, coord.fim) }
  // quadro: linha de tabela com coordenação e valores/quantidades
  for (const o of ocorrencias(pages, /coordenad(?:or|ora)|coordenacao|responsavel tecnic|diretor(?:a)? tecnic/)) {
    const linha = o.pg.fold.slice(Math.max(0, o.ini - 90), o.fim + 120)
    if (/r\$ ?\d|\b\d+ ?(?:h|horas)\b|\b\d+ ?(?:mes|mensal)/.test(linha)) {
      out.quadroCoord = { valor: 'Sim', ...fonte(o.pg, o.ini, o.fim) }
      break
    }
  }

  const cursos = new Map()
  for (const o of ocorrencias(pages, /\b(acls|atls|pals|bls|phtls|aclss|npals|salv|alss|amls|neoreanimacao|reanimacao neonatal)\b/)) {
    if (!cursos.has(o.m[1])) cursos.set(o.m[1], o)
  }
  if (cursos.size) {
    const first = [...cursos.values()][0]
    out.exigeCursos = { valor: 'Sim', ...fonte(first.pg, first.ini, first.fim) }
    out.quaisCursos = { valor: [...cursos.keys()].map((c) => (c.length <= 6 ? c.toUpperCase() : titulo(c))).join(', '), ...fonte(first.pg, first.ini, first.fim) }
  }

  const rqe = primeira(pages, /\brqe\b|registro de qualificacao de especialista/)
  if (rqe) out.especialistaRQE = { valor: 'Sim', ...fonte(rqe.pg, rqe.ini, rqe.fim) }
  const tit = primeira(pages, /titulo de especialista|certificado de especialista/)
  if (tit) out.especialistaTitulo = { valor: 'Sim', ...fonte(tit.pg, tit.ini, tit.fim) }
  for (const o of ocorrencias(pages, /pos[- ]?graduacao|especializacao lato sensu|residencia medica/)) {
    const f = frase(o.pg, o.ini, o.fim)
    if (!/medic|especialist|profission|especialidade/.test(f.txt)) continue
    out.posGrad = { valor: NEG.test(f.txt) ? 'Não' : 'Sim', ...fonte(o.pg, f.a + 1, f.b, 0) }
    break
  }
  return out
}

function link(pages) {
  const re = /https?:\/\/[^\s"<>)]+/gi
  let melhor = null
  for (const pg of pages) {
    if (pg.k > 6) continue
    for (const m of pg.texto.matchAll(re)) {
      const url = m[0].replace(/[.,;:]+$/, '')
      const s = /pncp\.gov\.br/.test(url) ? 3 : /licita|compras|bll|bnc|portal|pregao|comprasnet|gov\.br/.test(url) ? 2 : 0
      if (s && (!melhor || s > melhor.s)) melhor = { s, url, pg }
    }
  }
  if (!melhor) return {}
  return { linkProcesso: { valor: melhor.url, origem: 'documento', arquivo: melhor.pg.arquivo, pagina: melhor.pg.n, trecho: melhor.url } }
}

// Termos de busca por especialidade (nome oficial + termos usados nos editais)
const TERMOS_ESP = (() => {
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const map = new Map(CFM_ESPECIALIDADES.map((n) => [n, new Set([fold(n)])]))
  for (const [k, v] of Object.entries(ALIAS)) {
    if (k === 'clinico' || k === 'uti' || k === 'psf' || k === 'gineco') continue // genéricos demais
    map.get(v)?.add(k)
  }
  map.get('Clínica Médica')?.add('medico clinico')
  map.get('Medicina Intensiva')?.add('medico intensivista')
  map.get('Ginecologia e Obstetrícia')?.add('ginecologista obstetra')
  return [...map.entries()].map(([nome, set]) => ({
    nome,
    re: new RegExp(`\\b(?:${[...set].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/')).join('|')})s?\\b`),
  }))
})()

function especialidades(pages, regrasOut) {
  const achadas = []
  for (const t of TERMOS_ESP) {
    let n = 0
    let first = null
    for (const o of ocorrencias(pages, t.re)) {
      n++
      if (!first) first = o
      if (n > 50) break
    }
    if (n) achadas.push({ nome: t.nome, n, first })
  }
  const mod = regrasOut.especialistaRQE ? 'RQE' : regrasOut.posGrad?.valor === 'Sim' ? 'Pós' : 'Não especificado'
  return achadas
    .sort((a, b) => b.n - a.n)
    .slice(0, 15)
    .map((a) => ({ nome: a.nome, modalidade: mod, arquivo: a.first.pg.arquivo, pagina: a.first.pg.n, trecho: trechoDe(a.first.pg, a.first.ini, a.first.fim), ocorrencias: a.n }))
}

const NOMES = {
  descritivo: 'descritivo', orgao: 'órgão', municipio: 'município', orgaoCnpj: 'CNPJ do órgão', modalidade: 'modalidade',
  numeroEdital: 'número do edital', dataSessao: 'data da sessão', horaSessao: 'horário', objeto: 'objeto',
  estimadoGlobal: 'valor estimado global', vigencia: 'vigência', tipoLicitacao: 'critério de julgamento', modoDisputa: 'modo de disputa',
}

// ---------- Principal ----------
export function extrairEdital(docs) {
  const pages = corpus(docs)
  const campos = {}
  const add = (obj) => {
    for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_') && v && v.valor !== undefined && v.valor !== '') campos[k] = v
    return obj
  }

  const om = add(orgaoEMunicipio(pages))
  const oc = primeira(pages, /cnpj(?:\/mf)?(?: n[ºo°.]*| sob o n[ºo°.]*)?\s?[:\-]?\s?(\d{2}\.?\d{3}\.?\d{3}\s?\/?\s?\d{4}\s?-?\s?\d{2})/, { maxK: 4 })
  if (oc) {
    const d = oc.m[1].replace(/\D/g, '')
    campos.orgaoCnpj = { valor: `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`, ...fonte(oc.pg, oc.ini, oc.fim) }
  }
  const mn = add(modalidadeENumero(pages))
  add(sessao(pages))
  add(criterio(pages))
  add(modoDisputa(pages))
  add(objeto(pages))
  add(locais(pages))
  add(valorEstimado(pages))
  add(vigenciaRenovacao(pages))
  const rg = add(regras(pages))
  add(link(pages))

  // Descritivo no padrão "Cidade UF - PE nn aaaa - Abertura dd mm aaaa"
  const partes = []
  if (om._cidade) partes.push(`${om._cidade}${om._uf ? ' ' + om._uf : ''}`)
  if (mn._num) partes.push(`${SIGLA[campos.modalidade?.valor] || 'Nº'} ${mn._num.n}${mn._num.ano ? ' ' + mn._num.ano : ''}`)
  if (campos.dataSessao) partes.push(`Abertura ${campos.dataSessao.valor.split('-').reverse().join(' ')}`)
  if (partes.length >= 2) {
    const base = campos.numeroEdital || campos.municipio
    campos.descritivo = { valor: partes.join(' - '), origem: 'documento', arquivo: base.arquivo, pagina: base.pagina, trecho: 'Montado a partir do município, da modalidade, do número e da data da sessão.' }
  }

  const esps = especialidades(pages, rg)
  const faltando = Object.keys(NOMES).filter((k) => !campos[k]).map((k) => NOMES[k])
  const obs = []
  if (faltando.length) obs.push(`Não localizados automaticamente: ${faltando.join(', ')}. Preencha à mão na aba Processo.`)
  if (campos.estimadoGlobal) obs.push('Confira o valor estimado: quando o edital tem vários lotes, o maior valor encontrado pode ser o total de todos os lotes.')
  if (esps.length) obs.push('Especialidades identificadas por menção no texto; remova as que forem apenas citadas (ex.: exigências de saúde ocupacional).')

  return {
    campos,
    especialidades: esps,
    itensTR: [],
    observacoes: obs.join('\n'),
    paginasLidas: pages.length,
  }
}
