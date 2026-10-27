import { useState } from 'react'
import { projecao } from '../lib/calc'
import { money0, pct } from '../lib/format'
import { PageHead, Panel } from '../components/ui'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function Projecao({ p, c }) {
  const [view, setView] = useState('anos')
  const [showTrib, setShowTrib] = useState(false)
  const [showItens, setShowItens] = useState(false)
  const { meses, rows } = projecao(p, c)

  const cols = view === 'anos' ? Array.from({ length: 10 }, (_, i) => `Ano ${i + 1}`) : meses.map((d) => `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`)
  const visible = rows.filter((r) => (r.group === 'trib' ? showTrib : r.group === 'itens' ? showItens : true))
  const fmt = (r, v) => (r.isPct ? pct(v, 1) : money0(v))

  return (
    <div className="stack">
      <PageHead title="Projeção">
        Calculada a partir da aba Margem. Faturamento reajusta pelo IPCA, médicos pelo reajuste médico e custos indiretos pelo reajuste de indiretos (aba Premissas).
        {' '}Início considerado: {MESES[meses[0].getMonth()]}/{meses[0].getFullYear()}.
      </PageHead>

      <Panel
        actions={
          <div className="seg" role="tablist" aria-label="Período">
            <button role="tab" aria-selected={view === 'anos'} className={view === 'anos' ? 'on' : ''} onClick={() => setView('anos')}>10 anos</button>
            <button role="tab" aria-selected={view === 'meses'} className={view === 'meses' ? 'on' : ''} onClick={() => setView('meses')}>12 meses</button>
          </div>
        }
        title={view === 'anos' ? 'Projeção de 10 anos' : 'Primeiros 12 meses'}
      >
        <div className="toggles">
          <label><input type="checkbox" checked={showTrib} onChange={(e) => setShowTrib(e.target.checked)} /> Detalhar tributos</label>
          <label><input type="checkbox" checked={showItens} onChange={(e) => setShowItens(e.target.checked)} /> Detalhar itens</label>
        </div>
        <div className="table-wrap">
          <table className="table proj-table">
            <thead>
              <tr>
                <th className="sticky-col">Linha</th>
                {cols.map((h) => <th key={h} className="num">{h}</th>)}
                <th className="num">{view === 'anos' ? 'Total 10 anos' : 'Ano 1'}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const vals = view === 'anos' ? r.years : r.months
                const total = view === 'anos' ? r.total : r.isPct ? r.years[0] : r.years[0]
                return (
                  <tr key={r.label} className={`${r.strong ? 'strong' : ''} ${r.group ? 'sub' : ''} ${r.result ? 'total' : ''}`}>
                    <td className="sticky-col">{r.label.trim()}</td>
                    {vals.map((v, i) => <td key={i} className={`num ${v < 0 ? 'neg' : ''}`}>{fmt(r, v)}</td>)}
                    <td className="num strong-cell">{fmt(r, total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
