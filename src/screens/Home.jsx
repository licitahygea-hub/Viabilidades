import { useMemo, useRef, useState } from 'react'
import { Plus, Upload, Download, Copy, Trash2, Search } from '../components/icons'
import { newProcess, duplicate } from '../lib/model'
import { compute } from '../lib/calc'
import { money0, pct, fmtDate } from '../lib/format'
import { downloadJSON, slug } from '../lib/store'
import { Status, Empty } from '../components/ui'

export default function Home({ store, go, missing }) {
  const fileRef = useRef(null)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(missing ? 'Essa viabilidade não existe neste navegador. Importe o backup para abri-la.' : '')

  const rows = useMemo(
    () =>
      store.processes
        .map((p) => ({ p, c: compute(p) }))
        .filter(({ p }) => {
          if (!q.trim()) return true
          const hay = [p.processo.descritivo, p.processo.municipio, p.processo.empresa, p.processo.numeroEdital].join(' ').toLowerCase()
          return hay.includes(q.trim().toLowerCase())
        }),
    [store.processes, q],
  )

  const create = () => {
    const p = newProcess()
    store.add(p)
    go(p.id, 'processo')
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const list = Array.isArray(data.processes) ? data.processes : data.processo ? [data] : null
      if (!list) throw new Error('formato')
      store.importMany(list)
      setMsg(`${list.length} viabilidade(s) importada(s).`)
    } catch {
      setMsg('O arquivo não é um backup válido deste sistema (.json exportado aqui).')
    }
  }

  const exportAll = () => {
    const d = new Date().toISOString().slice(0, 10)
    downloadJSON(`backup-viabilidades-${d}.json`, { version: 1, processes: store.processes })
  }

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-brand">
          <img src="/favicon.svg" alt="" width="36" height="36" />
          <div>
            <h1>Viabilidade financeira</h1>
            <p>Serviços médicos em licitações</p>
          </div>
        </div>
        <div className="home-actions">
          <button className="btn btn-primary" onClick={create}>
            <Plus size={18} /> Nova viabilidade
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Importar backup
          </button>
          {store.processes.length > 0 && (
            <button className="btn" onClick={exportAll}>
              <Download size={18} /> Exportar tudo
            </button>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        </div>
      </header>

      {msg && (
        <div className="notice" role="status">
          {msg}
          <button className="link" onClick={() => setMsg('')}>Fechar</button>
        </div>
      )}

      {store.processes.length > 3 && (
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input placeholder="Buscar por cidade, empresa ou edital" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      )}

      {store.processes.length === 0 ? (
        <Empty
          title="Nenhuma viabilidade ainda"
          action={
            <button className="btn btn-primary" onClick={create}>
              <Plus size={18} /> Criar a primeira
            </button>
          }
        >
          Cada viabilidade corresponde a um lote de uma licitação: dados do edital, quadro do TR, composição de preço e custo, simulador de lances e concorrentes.
        </Empty>
      ) : (
        <ul className="proc-list">
          {rows.map(({ p, c }) => (
            <li key={p.id} className={`proc-card kind-${c.verdict.kind}`}>
              <a className="proc-main" href={`#/p/${p.id}/painel`}>
                <span className="proc-title">{p.processo.descritivo || 'Viabilidade sem descritivo'}</span>
                <span className="proc-meta">
                  {[p.processo.empresa, p.processo.modalidade, p.processo.dataSessao && 'Sessão ' + fmtDate(p.processo.dataSessao)].filter(Boolean).join(', ') || 'Dados do processo não preenchidos'}
                </span>
                <span className="proc-figures">
                  <Status kind={c.verdict.kind}>{c.verdict.title}</Status>
                  {c.fatMensal > 0 && (
                    <>
                      <span><small>Global</small> {money0(c.limites.nossoGlobal)}</span>
                      {c.custoMensal > 0 && <span><small>Margem</small> {pct(c.margemTotal, 1)}</span>}
                    </>
                  )}
                </span>
              </a>
              <div className="proc-tools">
                <button className="icon-btn" title="Duplicar (outro lote)" aria-label="Duplicar" onClick={() => store.add(duplicate(p))}>
                  <Copy size={18} />
                </button>
                <button className="icon-btn" title="Exportar backup desta viabilidade" aria-label="Exportar" onClick={() => downloadJSON(`${slug(p.processo.descritivo)}.json`, p)}>
                  <Download size={18} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Excluir"
                  aria-label="Excluir"
                  onClick={() => {
                    if (window.confirm(`Excluir "${p.processo.descritivo || 'Viabilidade sem descritivo'}"? Esta ação não pode ser desfeita.`)) store.remove(p.id)
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="home-foot">Os dados ficam salvos apenas neste navegador e dispositivo. Use “Exportar tudo” para guardar um backup ou levar para outro aparelho.</p>
    </div>
  )
}
