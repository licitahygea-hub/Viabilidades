// Arquivos do edital: guardados no IndexedDB do navegador (por viabilidade)
// e texto extraído no próprio navegador (PDF, DOCX, TXT e ZIP com esses tipos).
import { uid } from './model'

const DB = 'viabilidade-medicos-docs'
const STORE = 'files'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'id' })
      s.createIndex('procId', 'procId')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const out = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(out?.result ?? out)
    t.onerror = () => reject(t.error)
  })
}

export async function listDocs(procId) {
  const all = await tx('readonly', (s) => s.index('procId').getAll(procId))
  return (all || []).sort((a, b) => a.addedAt.localeCompare(b.addedAt))
}
export const putDoc = (doc) => tx('readwrite', (s) => s.put(doc))
export const deleteDoc = (id) => tx('readwrite', (s) => s.delete(id))
export async function deleteDocsOf(procId) {
  const docs = await listDocs(procId)
  await Promise.all(docs.map((d) => deleteDoc(d.id)))
}
export async function getDoc(id) {
  return tx('readonly', (s) => s.get(id))
}

export const ACCEPT = '.pdf,.docx,.txt,.zip,application/pdf,application/zip'
const ext = (name) => (name.split('.').pop() || '').toLowerCase()

// Adiciona arquivos (abre ZIPs e guarda cada documento suportado separadamente)
export async function addFiles(procId, fileList) {
  const added = []
  const skipped = []
  for (const f of fileList) {
    const e = ext(f.name)
    if (e === 'zip') {
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(f)
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue
        const name = entry.name.split('/').pop()
        if (!['pdf', 'docx', 'txt'].includes(ext(name)) || name.startsWith('.')) {
          skipped.push(`${f.name} › ${name}`)
          continue
        }
        const blob = await entry.async('blob')
        added.push(await save(procId, name, blob, f.name))
      }
    } else if (['pdf', 'docx', 'txt'].includes(e)) {
      added.push(await save(procId, f.name, f, null))
    } else {
      skipped.push(f.name)
    }
  }
  return { added, skipped }
}

async function save(procId, nome, blob, origemZip) {
  const doc = {
    id: uid(),
    procId,
    nome,
    origemZip,
    tipo: ext(nome),
    tamanho: blob.size,
    blob: new Blob([await blob.arrayBuffer()], { type: ext(nome) === 'pdf' ? 'application/pdf' : blob.type || 'application/octet-stream' }),
    addedAt: new Date().toISOString(),
    paginas: null, // [{ n, texto }]
  }
  await putDoc(doc)
  return doc
}

// ---------- Extração de texto ----------
let pdfjsPromise
async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default
      return lib
    })
  }
  return pdfjsPromise
}

async function pdfPages(blob) {
  const lib = await pdfjs()
  const task = lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
  const pdf = await task.promise
  const out = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const tc = await page.getTextContent()
    let texto = ''
    for (const it of tc.items) {
      texto += it.str
      texto += it.hasEOL ? '\n' : ' '
    }
    out.push({ n, texto: texto.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() })
    page.cleanup?.()
  }
  try {
    await (typeof task.destroy === 'function' ? task.destroy() : pdf.destroy?.())
  } catch {
    /* ignore */
  }
  return out
}

async function docxPages(blob) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(blob)
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) return [{ n: null, texto: '' }]
  const texto = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tc>/g, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return [{ n: null, texto }]
}

export async function extractText(doc) {
  if (doc.paginas) return doc
  let paginas
  if (doc.tipo === 'pdf') paginas = await pdfPages(doc.blob)
  else if (doc.tipo === 'docx') paginas = await docxPages(doc.blob)
  else paginas = [{ n: null, texto: (await doc.blob.text()).trim() }]
  const updated = { ...doc, paginas }
  await putDoc(updated)
  return updated
}

export function docStats(doc) {
  if (!doc.paginas) return null
  const chars = doc.paginas.reduce((a, p) => a + p.texto.length, 0)
  const vazias = doc.paginas.filter((p) => p.texto.length < 40).length
  const digitalizado = doc.tipo === 'pdf' && doc.paginas.length > 0 && vazias / doc.paginas.length > 0.6
  return { paginas: doc.tipo === 'pdf' ? doc.paginas.length : null, chars, digitalizado }
}

export function openDoc(doc, pagina) {
  const url = URL.createObjectURL(doc.blob)
  const w = window.open(url + (pagina && doc.tipo === 'pdf' ? `#page=${pagina}` : ''), '_blank', 'noopener')
  if (!w) {
    const a = document.createElement('a')
    a.href = url
    a.download = doc.nome
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const LIMITE_CHARS = 900_000 // ~ 250 mil tokens; mantém o pedido abaixo do limite de 4,5 MB da Vercel
const LIMITE_PDF_B64 = 3_000_000 // PDF digitalizado (sem texto) enviado como arquivo, se couber

// Monta o pacote enviado à função /api/extrair-edital
export async function buildPayload(docs) {
  const textos = []
  const pdfs = []
  let total = 0
  let truncado = false
  for (const d of docs) {
    const st = docStats(d)
    if (st?.digitalizado) {
      if (d.tamanho <= LIMITE_PDF_B64 && !pdfs.length) {
        pdfs.push({ nome: d.nome, base64: await blobToBase64(d.blob) })
      }
      continue
    }
    const paginas = []
    for (const p of d.paginas || []) {
      if (total + p.texto.length > LIMITE_CHARS) {
        truncado = true
        break
      }
      total += p.texto.length
      paginas.push(p)
    }
    textos.push({ nome: d.nome, paginas })
  }
  return { textos, pdfs, truncado }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export const fmtSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB')
