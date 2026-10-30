// Lê a aba "Parâmetros" da planilha e gera src/config/parametros.json.
// Uso: npm run config            (usa planilha/Parametros_Modelo_Viabilidade.xlsx)
//      npm run config -- outra.xlsx
// Colunas: B = bloco (menu lateral) · C = seção · D = parâmetro · E = célula
//          F = destino (de/para) · G = tipo · H = opções · I = preenchimento
//          K = exemplo · L = observação
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arquivo = resolve(process.argv[2] || resolve(raiz, 'planilha/Parametros_Modelo_Viabilidade.xlsx'))

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
   .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&')
const textoDe = (xml) => decode([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''))

const zip = await JSZip.loadAsync(readFileSync(arquivo))
const ler = async (p) => (zip.file(p) ? zip.file(p).async('string') : '')

// Descobre o arquivo da aba "Parâmetros" (ou a primeira aba)
const wbXml = await ler('xl/workbook.xml')
const relsXml = await ler('xl/_rels/workbook.xml.rels')
const abas = [...wbXml.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g)].map((m) => ({ nome: decode(m[1]), rid: m[2] }))
const aba = abas.find((a) => a.nome === 'Parâmetros') || abas[0]
const alvo = new RegExp(`Id="${aba.rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${aba.rid}"`).exec(relsXml)
const caminhoAba = 'xl/' + (alvo[1] || alvo[2]).replace(/^\/?xl\//, '').replace(/^\//, '')

const shared = [...(await ler('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1]))
const sheetXml = await ler(caminhoAba)

const linhas = []
for (const [, rowXml] of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
  const linha = {}
  for (const m of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1], corpo = m[2] || ''
    const col = /r="([A-Z]+)\d+"/.exec(attrs)?.[1]
    if (!col) continue
    const t = /t="([^"]+)"/.exec(attrs)?.[1]
    const v = /<v>([\s\S]*?)<\/v>/.exec(corpo)?.[1]
    if (t === 's') linha[col] = shared[+v] ?? ''
    else if (t === 'inlineStr') linha[col] = textoDe(corpo)
    else if (v !== undefined) linha[col] = decode(v)
  }
  linhas.push(linha)
}

const txt = (v) => String(v ?? '').trim()
const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const normDestino = (f) => {
  const s = slug(f)
  if (s.includes('cliente')) return 'cliente'
  if (s.includes('margem')) return 'margem'
  if (s.includes('agenda')) return 'agenda'
  return s || 'sem-destino'
}

const campos = new Map()
const blocos = []
const destinos = new Map()

for (const l of linhas) {
  const bloco = txt(l.B), secao = txt(l.C), param = txt(l.D), celula = txt(l.E)
  if (!bloco || !param || bloco === 'Bloco (aba)') continue
  const destinoNome = txt(l.F)
  const destino = normDestino(destinoNome)
  if (!destinos.has(destino)) destinos.set(destino, destinoNome || destino)
  if (!blocos.includes(bloco)) blocos.push(bloco)

  // Mesmo bloco + mesma célula = mesmo campo, ainda que apareça uma vez por destino (de/para)
  const id = `${slug(bloco)}__${slug(celula) || slug(param)}`
  if (campos.has(id)) {
    const c = campos.get(id)
    if (!c.destinos.includes(destino)) c.destinos.push(destino)
    continue
  }
  const repete = /\(por [^)]+\)/i.test(secao) || /…|\.\.\./.test(celula) || /^[A-Z]+\d+:[A-Z]+\d+$/.test(celula)
  campos.set(id, {
    id,
    bloco,
    secao,
    parametro: param,
    celula,
    destinos: [destino],
    tipo: txt(l.G) || 'Texto',
    opcoes: txt(l.H) ? txt(l.H).split('·').map((o) => o.trim()).filter(Boolean) : [],
    preenchimento: txt(l.I) || 'Opcional',
    exemplo: txt(l.K),
    observacao: txt(l.L),
    repete,
  })
}

// Ordem do menu: se outra aba listar os blocos sob o cabeçalho "Bloco (aba)", segue essa ordem
for (const outra of abas.filter((a) => a !== aba)) {
  const rel = new RegExp(`Id="${outra.rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${outra.rid}"`).exec(relsXml)
  if (!rel) continue
  const xml = await ler('xl/' + (rel[1] || rel[2]).replace(/^\/?xl\//, '').replace(/^\//, ''))
  const valores = [...xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((m) => {
    const t = /t="([^"]+)"/.exec(m[1])?.[1], v = /<v>([\s\S]*?)<\/v>/.exec(m[2] || '')?.[1]
    return txt(t === 's' ? shared[+v] : t === 'inlineStr' ? textoDe(m[2] || '') : v)
  })
  const i = valores.indexOf('Bloco (aba)')
  if (i < 0) continue
  const ordem = valores.slice(i + 1).filter(Boolean)
  blocos.sort((a, b) => (ordem.indexOf(a) + 1 || 999) - (ordem.indexOf(b) + 1 || 999))
  break
}

const config = {
  origem: arquivo.split(/[\\/]/).pop(),
  blocos,
  destinos: Object.fromEntries(destinos),
  campos: [...campos.values()],
}
writeFileSync(resolve(raiz, 'src/config/parametros.json'), JSON.stringify(config, null, 2) + '\n')
console.log(`${config.campos.length} campos · blocos: ${blocos.join(', ')} · destinos: ${[...destinos.keys()].join(', ')}`)
