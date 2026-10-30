import { useRef, useState } from 'react'

// Seletor do modelo de viabilidade preenchido (.xlsx)
export function SeletorModelo({ onImportar, rotulo = 'Escolher planilha de viabilidade (.xlsx)', id = 'arquivo-modelo' }) {
  const ref = useRef(null)
  const [estado, setEstado] = useState({ lendo: false, erro: null })
  const ler = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/\.xlsx$/i.test(f.name)) { setEstado({ lendo: false, erro: 'Envie o modelo em formato .xlsx.' }); return }
    setEstado({ lendo: true, erro: null })
    try {
      await onImportar(await f.arrayBuffer(), f.name)
      setEstado({ lendo: false, erro: null })
    } catch (err) {
      setEstado({ lendo: false, erro: err?.message || 'Não foi possível ler a planilha.' })
    }
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>
        <button type="button" className="btn pri" disabled={estado.lendo} onClick={() => ref.current?.click()}>
          {estado.lendo ? 'Lendo planilha…' : rotulo}
        </button>
        <input ref={ref} id={id} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={ler} />
      </div>
      {estado.erro && <span className="msg-erro" role="alert">{estado.erro}</span>}
    </div>
  )
}

export function RelatorioImportacao({ rel, arquivo }) {
  return (
    <div className="relatorio" role="status">
      <div className="kpis">
        <div className="kpi"><span>Campos importados</span><b>{rel.importados}</b><small>{arquivo}</small></div>
        <div className="kpi"><span>Itens</span><b>{rel.itens}</b><small>TR e Margem</small></div>
        <div className="kpi"><span>Mantidos automáticos</span><b>{rel.automaticos}</b><small>células com fórmula padrão</small></div>
        <div className="kpi"><span>Não importados</span><b style={{ color: rel.ignorados.length ? 'var(--warn)' : undefined }}>{rel.ignorados.length}</b><small>fora do padrão</small></div>
      </div>
      {rel.avisos.length > 0 && (
        <div className="aviso info"><b>Avisos</b><ul>{rel.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
      )}
      {rel.ignorados.length > 0 && (
        <div className="aviso">
          <b>Valores que não seguem o padrão e ficaram em branco para revisar:</b>
          <ul>{rel.ignorados.slice(0, 12).map((x, i) => <li key={i}><span className="mono">{x.celula}</span> · {x.parametro}: {x.motivo}</li>)}</ul>
          {rel.ignorados.length > 12 && <span>e mais {rel.ignorados.length - 12}.</span>}
        </div>
      )}
    </div>
  )
}
