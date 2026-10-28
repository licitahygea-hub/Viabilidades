import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogo, loadCustom, saveCustom, norm, MODALIDADES_ESP, CFM_ESPECIALIDADES } from '../lib/especialidades'
import { uid } from '../lib/model'
import { Sheet } from './ui'
import { Plus, Trash2, X, Check, Search } from './icons'

// Seletor de especialidades (modelo Arpen): lista CFM + próprias, com "Com RQE" / "Com Pós"
export default function Especialidades({ value = [], onChange, fontes }) {
  const [custom, setCustom] = useState(loadCustom)
  const [open, setOpen] = useState(false)
  const [manage, setManage] = useState(false)
  const [q, setQ] = useState('')
  const boxRef = useRef(null)
  const searchRef = useRef(null)

  const cat = useMemo(() => catalogo(custom), [custom])
  const filtered = useMemo(() => {
    const n = norm(q)
    return n ? cat.filter((c) => norm(c.nome).includes(n)) : cat
  }, [cat, q])
  const exists = cat.some((c) => norm(c.nome) === norm(q))

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const updateCustom = (list) => {
    setCustom(list)
    saveCustom(list)
  }

  const add = (nome, modalidade) => {
    const i = value.findIndex((v) => norm(v.nome) === norm(nome))
    if (i >= 0) onChange(value.map((v, j) => (j === i ? { ...v, modalidade } : v)))
    else onChange([...value, { id: uid(), nome, modalidade }])
  }

  const addNew = (modalidade) => {
    const nome = q.trim()
    if (!nome) return
    if (!exists) updateCustom([...custom, nome])
    add(nome, modalidade)
    setQ('')
  }

  const selected = (nome) => value.find((v) => norm(v.nome) === norm(nome))

  return (
    <div className="esp">
      <div className="esp-head">
        <p className="small muted">
          {cat.length} especialidades disponíveis (CFM{custom.length ? ` + ${cat.length - CFM_ESPECIALIDADES.length} própria(s)` : ''}). Abra a lista, pesquise e escolha “Com RQE” ou “Com Pós” para incluir.
        </p>
        <button type="button" className="btn btn-sm" onClick={() => setManage(true)}>Gerenciar especialidades</button>
      </div>

      <div className="esp-box" ref={boxRef}>
        <button type="button" className={`esp-trigger${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span>Selecione a especialidade…</span>
          <span className="esp-count">{cat.length} disponíveis</span>
          <span className="esp-caret" aria-hidden="true">▾</span>
        </button>
        {open && (
          <div className="esp-pop" role="listbox">
            <label className="esp-search">
              <Search size={16} />
              <input ref={searchRef} placeholder="Pesquisar especialidade…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <ul className="esp-list">
              {filtered.map((c) => {
                const s = selected(c.nome)
                return (
                  <li key={c.nome} className={s ? 'is-sel' : ''}>
                    <span className="esp-name">
                      {s && <Check size={15} />} {c.nome}
                      {c.origem === 'propria' && <em className="tag">própria</em>}
                    </span>
                    <span className="esp-btns">
                      {MODALIDADES_ESP.map((m) => (
                        <button type="button" key={m} className={`chip-btn${s?.modalidade === m ? ' on' : ''}`} onClick={() => add(c.nome, m)}>
                          Com {m}
                        </button>
                      ))}
                    </span>
                  </li>
                )
              })}
              {q.trim().length >= 4 && !exists && (
                <li className="esp-new">
                  <span className="esp-name">Incluir “{q.trim()}” (não está na lista)</span>
                  <span className="esp-btns">
                    {MODALIDADES_ESP.map((m) => (
                      <button type="button" key={m} className="chip-btn" onClick={() => addNew(m)}>Com {m}</button>
                    ))}
                  </span>
                </li>
              )}
              {!filtered.length && !q.trim() && <li className="muted small">Nenhuma especialidade.</li>}
            </ul>
          </div>
        )}
      </div>

      {value.length > 0 ? (
        <ul className="esp-selected">
          {value.map((v) => {
            const f = fontes?.[`esp:${norm(v.nome)}`]
            return (
              <li key={v.id}>
                <div className="esp-sel-name">
                  <strong>{v.nome}</strong>
                  {f?.arquivo && <span className="small muted">Edital: {f.arquivo}{f.pagina ? `, p. ${f.pagina}` : ''}</span>}
                </div>
                <div className="seg seg-sm" role="radiogroup" aria-label={`Exigência para ${v.nome}`}>
                  {MODALIDADES_ESP.map((m) => (
                    <button type="button" key={m} role="radio" aria-checked={v.modalidade === m} className={v.modalidade === m ? 'on' : ''} onClick={() => onChange(value.map((x) => (x.id === v.id ? { ...x, modalidade: m } : x)))}>
                      Com {m}
                    </button>
                  ))}
                </div>
                <button type="button" className="icon-btn danger" aria-label={`Remover ${v.nome}`} onClick={() => onChange(value.filter((x) => x.id !== v.id))}>
                  <X size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="small muted">Nenhuma especialidade selecionada.</p>
      )}

      <GerenciarSheet open={manage} onClose={() => setManage(false)} custom={custom} onChange={updateCustom} />
    </div>
  )
}

function GerenciarSheet({ open, onClose, custom, onChange }) {
  const [nome, setNome] = useState('')
  const add = () => {
    const n = nome.trim()
    if (!n) return
    const dup = [...CFM_ESPECIALIDADES, ...custom].some((c) => norm(c) === norm(n))
    if (!dup) onChange([...custom, n])
    setNome('')
  }
  return (
    <Sheet open={open} onClose={onClose} title="Gerenciar especialidades">
      <p className="small muted">As 55 especialidades do CFM (Resolução nº 2.380/2024) já estão na lista. Inclua aqui as que não forem localizadas; elas ficam disponíveis em todas as viabilidades deste navegador.</p>
      <form
        className="inline-add"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input placeholder="Nome da especialidade" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome da especialidade" />
        <button className="btn btn-primary" type="submit"><Plus size={18} /> Incluir</button>
      </form>
      {custom.length ? (
        <ul className="plain-list">
          {custom.map((c) => (
            <li key={c}>
              <span>{c}</span>
              <button className="icon-btn danger" aria-label={`Excluir ${c}`} onClick={() => onChange(custom.filter((x) => x !== c))}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Nenhuma especialidade própria cadastrada.</p>
      )}
    </Sheet>
  )
}
