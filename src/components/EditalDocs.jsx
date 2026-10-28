import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, Sheet, Status, FonteTag } from './ui'
import { Upload, Trash2, FileText, Check } from './icons'
import FonteSheet from './FonteSheet'
import { ACCEPT, addFiles, listDocs, deleteDoc, extractText, docStats, buildPayload, openDoc, fmtSize } from '../lib/docs'
import { callApi } from '../lib/config'
import { PROCESSO_SECTIONS, newTrItem } from '../lib/model'
import { LISTS } from '../lib/lists'
import { campoDef } from '../../shared/campos-edital.js'
import { matchEspecialidade, catalogo, loadCustom, saveCustom, norm, MODALIDADES_ESP } from '../lib/especialidades'
import { money, fmtDate, num } from '../lib/format'

const ORDEM = PROCESSO_SECTIONS.flatMap((s) => s.fields.map((f) => ({ ...f, secao: s.title })))

function vazio(key, v) {
  if (v === null || v === undefined || v === '') return true
  if (key === 'vigencia' && v === 12) return true // valor padrão
  return false
}

// Converte o valor vindo da IA para o formato do campo
function converter(key, v) {
  const f = campoDef(key)
  if (!f || v === null || v === undefined || v === '') return undefined
  switch (f.type) {
    case 'select':
      return LISTS[f.list]?.includes(v) ? v : undefined
    case 'int':
      return Number.isFinite(+v) ? Math.round(+v) : undefined
    case 'money':
    case 'number':
      return Number.isFinite(+v) ? +v : undefined
    case 'percent':
      return Number.isFinite(+v) ? (+v > 1 ? +v / 100 : +v) : undefined
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
    case 'time':
      return /^\d{1,2}:\d{2}/.test(v) ? v.padStart(5, '0').slice(0, 5) : undefined
    default:
      return String(v).trim() || undefined
  }
}

function mostrar(key, v) {
  const f = campoDef(key)
  if (v === null || v === undefined || v === '') return '—'
  if (!f) return String(v)
  if (f.type === 'money') return money(v)
  if (f.type === 'date') return fmtDate(v)
  if (f.type === 'percent') return num(v * 100, 1) + '%'
  if (f.type === 'int') return num(v, 0)
  return String(v)
}

export default function EditalDocs({ p, api }) {
  const [docs, setDocs] = useState([])
  const [busy, setBusy] = useState(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [review, setReview] = useState(false)
  const [drag, setDrag] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef(null)

  const refresh = useCallback(() => listDocs(p.id).then(setDocs).catch(() => setErro('Este navegador não permite guardar arquivos (modo privado?).')), [p.id])
  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!busy?.ia) return
    const t0 = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy?.ia])

  const onFiles = async (files) => {
    if (!files?.length) return
    setErro('')
    setAviso('')
    try {
      setBusy({ etapa: 'Guardando arquivos…' })
      const { skipped } = await addFiles(p.id, Array.from(files))
      if (skipped.length) setAviso(`Ignorados (formato não suportado): ${skipped.slice(0, 6).join(', ')}${skipped.length > 6 ? '…' : ''}. Use PDF, DOCX, TXT ou ZIP.`)
      await refresh()
    } catch (e) {
      setErro('Não foi possível guardar os arquivos: ' + e.message)
    } finally {
      setBusy(null)
    }
  }

  const ler = async () => {
    setErro('')
    setAviso('')
    try {
      const prontos = []
      for (let i = 0; i < docs.length; i++) {
        setBusy({ etapa: `Lendo o texto dos arquivos (${i + 1} de ${docs.length})…` })
        prontos.push(await extractText(docs[i]))
      }
      setDocs(prontos)
      const payload = await buildPayload(prontos)
      const avisos = []
      if (payload.truncado) avisos.push('Os documentos são muito longos; parte final não foi enviada à análise.')
      const digit = prontos.filter((d) => docStats(d)?.digitalizado)
      if (digit.length) avisos.push(`${digit.map((d) => d.nome).join(', ')} parece(m) digitalizado(s) (imagem, sem texto). ${payload.pdfs.length ? 'Um deles foi enviado como imagem para leitura.' : 'Envie uma versão pesquisável ou um arquivo de até 3 MB.'}`)
      setAviso(avisos.join(' '))
      setBusy({ etapa: 'Analisando o edital com IA…', ia: true })
      setElapsed(0)
      const hoje = new Date().toISOString().slice(0, 10)
      const res = await callApi('/api/extrair-edital', { ...payload, hoje })
      api.setField('extracao', { data: new Date().toISOString(), arquivos: prontos.map((d) => d.nome), resultado: res })
      setReview(true)
    } catch (e) {
      setErro(e.message || 'Falha na leitura.')
    } finally {
      setBusy(null)
    }
  }

  const remover = async (d) => {
    await deleteDoc(d.id)
    refresh()
  }

  const ext = p.extracao
  const nCampos = ext?.resultado?.campos ? Object.keys(ext.resultado.campos).length : 0

  return (
    <Panel
      title="Edital e anexos"
      subtitle="Anexe o edital, o TR e os demais anexos. A IA lê os documentos, preenche a aba Processo e indica a página de onde tirou cada dado."
      className={`docs-panel${drag ? ' is-drag' : ''}`}
    >
      <div
        className="dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        <button className="btn" onClick={() => inputRef.current?.click()} disabled={!!busy}>
          <Upload size={18} /> Anexar arquivos
        </button>
        <span className="small muted">PDF, DOCX, TXT ou ZIP. Pode arrastar para cá.</span>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }} />
      </div>

      {docs.length > 0 && (
        <ul className="doc-list">
          {docs.map((d) => {
            const st = docStats(d)
            return (
              <li key={d.id}>
                <FileText size={18} />
                <button className="doc-name link-plain" onClick={() => openDoc(d)} title="Abrir">
                  {d.nome}
                </button>
                <span className="small muted doc-meta">
                  {fmtSize(d.tamanho)}
                  {st?.paginas ? `, ${st.paginas} p.` : ''}
                  {d.origemZip ? `, de ${d.origemZip}` : ''}
                </span>
                {st?.digitalizado && <Status kind="warn">Sem texto</Status>}
                <button className="icon-btn danger" aria-label={`Remover ${d.nome}`} onClick={() => remover(d)} disabled={!!busy}>
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="docs-actions">
        <button className="btn btn-primary" onClick={ler} disabled={!docs.length || !!busy}>
          Ler documentos e preencher o Processo
        </button>
        {ext && !busy && (
          <button className="btn" onClick={() => setReview(true)}>
            Revisar última leitura ({nCampos} campos)
          </button>
        )}
      </div>

      {busy && (
        <div className="progress" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>
            {busy.etapa}
            {busy.ia ? ` ${elapsed}s` : ''}
          </span>
        </div>
      )}
      {aviso && <p className="small warn-text">{aviso}</p>}
      {erro && <p className="small neg">{erro}</p>}
      {ext && !busy && (
        <p className="small muted">
          Última leitura em {new Date(ext.data).toLocaleString('pt-BR')}{ext.aplicadoEm ? `, aplicada em ${new Date(ext.aplicadoEm).toLocaleString('pt-BR')}` : ', ainda não aplicada'}.
        </p>
      )}

      {review && ext && <Revisao p={p} api={api} ext={ext} onClose={() => setReview(false)} />}
    </Panel>
  )
}

// ---------- Revisão antes de aplicar ----------
function Revisao({ p, api, ext, onClose }) {
  const r = ext.resultado || {}
  const campos = r.campos || {}
  const linhas = ORDEM.filter((f) => campos[f.key]).map((f) => {
    const novo = converter(f.key, campos[f.key].valor)
    const atual = p.processo[f.key]
    const igual = novo !== undefined && String(novo) === String(atual ?? '')
    return { f, novo, atual, igual, fonte: campos[f.key], invalido: novo === undefined }
  })
  const [sel, setSel] = useState(() => new Set(linhas.filter((l) => !l.invalido && !l.igual && vazio(l.f.key, l.atual)).map((l) => l.f.key)))
  const cat = catalogo()
  const [esps, setEsps] = useState(() =>
    (r.especialidades || []).map((e) => {
      const nomeCat = matchEspecialidade(e.nome, cat)
      const ja = (p.processo.especialidades || []).some((x) => norm(x.nome) === norm(nomeCat || e.nome))
      return { ...e, nomeFinal: nomeCat || e.nome, novo: !nomeCat, mod: e.modalidade === 'Pós' ? 'Pós' : 'RQE', on: !ja }
    }),
  )
  const trItens = r.itensTR || []
  const trVazio = !p.tr.some((t) => t.profissional && t.profissional.trim())
  const [trOn, setTrOn] = useState(trItens.length > 0 && trVazio)
  const [fonte, setFonte] = useState(null)

  const toggle = (k) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  const total = sel.size + esps.filter((e) => e.on).length + (trOn ? 1 : 0)

  const aplicar = () => {
    const patch = {}
    const fontes = {}
    for (const l of linhas) {
      if (!sel.has(l.f.key) || l.invalido) continue
      patch[l.f.key] = l.novo
      const { arquivo, pagina, trecho, origem } = l.fonte
      fontes[l.f.key] = { arquivo, pagina, trecho, origem }
    }
    // especialidades
    const escolhidas = esps.filter((e) => e.on)
    if (escolhidas.length) {
      const custom = loadCustom()
      const novos = escolhidas.filter((e) => e.novo && !custom.some((c) => norm(c) === norm(e.nomeFinal))).map((e) => e.nomeFinal)
      if (novos.length) saveCustom([...custom, ...novos])
      const atual = [...(p.processo.especialidades || [])]
      for (const e of escolhidas) {
        const i = atual.findIndex((x) => norm(x.nome) === norm(e.nomeFinal))
        if (i >= 0) atual[i] = { ...atual[i], modalidade: e.mod }
        else atual.push({ id: Math.random().toString(36).slice(2, 10), nome: e.nomeFinal, modalidade: e.mod })
        if (e.arquivo) fontes[`esp:${norm(e.nomeFinal)}`] = { arquivo: e.arquivo, pagina: e.pagina, trecho: e.trecho, origem: 'documento' }
      }
      patch.especialidades = atual
    }
    api.set((pp) => {
      let tr = pp.tr
      if (trOn && trItens.length) {
        const novos = trItens.map((t) => ({
          ...newTrItem(),
          profissional: t.profissional || '',
          local: t.local || '',
          cargaTexto: t.cargaTexto || '',
          base: LISTS.BaseCarga.includes(t.base) ? t.base : 'h/mês',
          qtd: Number.isFinite(t.qtd) ? t.qtd : null,
          nProf: Number.isFinite(t.nProf) && t.nProf > 0 ? t.nProf : 1,
          valorHora: Number.isFinite(t.valorHora) ? t.valorHora : null,
          valorTR: Number.isFinite(t.valorTR) ? t.valorTR : null,
        }))
        const existentes = pp.tr.filter((t) => t.profissional && t.profissional.trim())
        tr = [...existentes, ...novos]
      }
      return {
        ...api.patch(pp, patch),
        fontes: { ...pp.fontes, ...fontes },
        tr,
        extracao: { ...pp.extracao, aplicadoEm: new Date().toISOString() },
      }
    })
    onClose()
  }

  let secaoAtual = null
  return (
    <>
      <Sheet
        open
        size="lg"
        onClose={onClose}
        title="Conferir dados do edital"
        footer={
          <>
            <span className="small muted">{total} item(ns) marcado(s)</span>
            <button className="btn btn-primary" onClick={aplicar} disabled={!total}>
              <Check size={18} /> Aplicar no Processo
            </button>
          </>
        }
      >
        <p className="small muted">
          Confira cada valor com o trecho do documento antes de aplicar. Campos já preenchidos com valor diferente vêm desmarcados.
          {ext.arquivos?.length ? ` Arquivos lidos: ${ext.arquivos.join(', ')}.` : ''}
        </p>
        {r.observacoes && (
          <div className="callout">
            <strong>Pontos de atenção</strong>
            <p>{r.observacoes}</p>
          </div>
        )}
        {r.truncado && <p className="small warn-text">A resposta da IA foi cortada por tamanho; alguns campos podem faltar.</p>}

        <div className="rv-list">
          {linhas.map((l) => {
            const head = l.f.secao !== secaoAtual ? (secaoAtual = l.f.secao) : null
            return (
              <div key={l.f.key}>
                {head && <h3 className="rv-sec">{head}</h3>}
                <label className={`rv-row${l.invalido ? ' is-invalid' : ''}`}>
                  <input type="checkbox" checked={sel.has(l.f.key)} disabled={l.invalido} onChange={() => toggle(l.f.key)} />
                  <span className="rv-main">
                    <span className="rv-label">{l.f.label}</span>
                    <span className="rv-val">{l.invalido ? `“${String(l.fonte.valor)}” (fora das opções)` : mostrar(l.f.key, l.novo)}</span>
                    {!vazio(l.f.key, l.atual) && (
                      <span className="rv-cur">{l.igual ? 'Igual ao atual' : `Atual: ${mostrar(l.f.key, l.atual)}`}</span>
                    )}
                    <FonteTag fonte={l.fonte} onClick={(e) => {
                      e.preventDefault()
                      setFonte({ label: l.f.label, fonte: l.fonte })
                    }} />
                  </span>
                </label>
              </div>
            )
          })}
          {!linhas.length && <p className="muted">Nenhum campo da aba Processo foi identificado.</p>}
        </div>

        {esps.length > 0 && (
          <>
            <h3 className="rv-sec">Especialidades (equipe técnica)</h3>
            <div className="rv-list">
              {esps.map((e, i) => (
                <div key={i} className="rv-row">
                  <input type="checkbox" checked={e.on} onChange={() => setEsps((a) => a.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} aria-label={`Incluir ${e.nomeFinal}`} />
                  <span className="rv-main">
                    <span className="rv-val">{e.nomeFinal}</span>
                    <span className="rv-cur">
                      {e.nome !== e.nomeFinal ? `No edital: “${e.nome}”. ` : ''}
                      {e.novo ? 'Não está na lista do CFM; será incluída como especialidade própria. ' : ''}
                      {e.modalidade === 'Não especificado' ? 'Exigência não especificada no edital.' : ''}
                    </span>
                    <span className="seg seg-sm">
                      {MODALIDADES_ESP.map((m) => (
                        <button type="button" key={m} className={e.mod === m ? 'on' : ''} onClick={() => setEsps((a) => a.map((x, j) => (j === i ? { ...x, mod: m } : x)))}>
                          Com {m}
                        </button>
                      ))}
                    </span>
                    {e.arquivo && (
                      <FonteTag fonte={{ arquivo: e.arquivo, pagina: e.pagina, trecho: e.trecho, origem: 'documento' }} onClick={() => setFonte({ label: e.nomeFinal, fonte: { arquivo: e.arquivo, pagina: e.pagina, trecho: e.trecho } })} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {trItens.length > 0 && (
          <>
            <h3 className="rv-sec">Quadro de itens do TR</h3>
            <label className="rv-row">
              <input type="checkbox" checked={trOn} onChange={() => setTrOn((v) => !v)} />
              <span className="rv-main">
                <span className="rv-val">Importar {trItens.length} item(ns) para a aba TR</span>
                <span className="rv-cur">{trVazio ? 'A aba TR está vazia.' : 'Serão adicionados após os itens já existentes.'}</span>
              </span>
            </label>
            <ul className="tr-preview">
              {trItens.map((t, i) => (
                <li key={i}>
                  <strong>{t.profissional}</strong>
                  {t.local ? ` — ${t.local}` : ''}
                  <span className="small muted">
                    {' '}
                    {t.cargaTexto || `${num(t.qtd, 2)} ${t.base}`}
                    {Number.isFinite(t.valorHora) ? `, ${money(t.valorHora)}/h` : ''}
                    {t.pagina ? `, p. ${t.pagina}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sheet>
      {fonte && <FonteSheet procId={p.id} info={fonte} onClose={() => setFonte(null)} />}
    </>
  )
}
