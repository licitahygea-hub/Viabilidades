import { useState } from 'react'
import { money, pct, num } from '../lib/format'

// Para onde vai cada R$ 100 faturados — barra 100% empilhada com rótulos diretos e legenda
export function Composition({ fat, parts }) {
  const [hover, setHover] = useState(null)
  const positive = parts.map((p) => ({ ...p, v: Math.max(0, p.value) }))
  const total = positive.reduce((a, b) => a + b.v, 0)
  if (!fat || !total) {
    return <p className="muted small">A composição aparece quando houver faturamento e custos nos itens.</p>
  }
  const active = hover !== null ? positive[hover] : null
  return (
    <div className="composition">
      <div className="comp-bar" role="img" aria-label={positive.map((p) => `${p.label} ${pct(p.v / total, 1)}`).join(', ')}>
        {positive.map((p, i) =>
          p.v > 0 ? (
            <button
              type="button"
              key={p.label}
              className={`comp-seg series-${i + 1}${hover !== null && hover !== i ? ' dim' : ''}`}
              style={{ flexGrow: p.v }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => setHover(hover === i ? null : i)}
              aria-label={`${p.label}: ${money(p.value)}, ${pct(p.v / total, 1)}`}
            />
          ) : null,
        )}
      </div>
      <div className="comp-tip" aria-live="polite">
        {active ? (
          <>
            <strong>{active.label}</strong> {money(active.value)} por mês, R$ {num((active.v / total) * 100, 2)} de cada R$ 100
          </>
        ) : (
          <span className="muted">Toque ou passe o mouse em uma faixa para ver o valor.</span>
        )}
      </div>
      <ul className="comp-legend">
        {positive.map((p, i) => (
          <li key={p.label}>
            <span className={`swatch series-${i + 1}`} aria-hidden="true" />
            <span className="comp-name">{p.label}</span>
            <span className="comp-val">R$ {num((p.v / total) * 100, 2)}</span>
          </li>
        ))}
      </ul>
      {parts.some((p) => p.value < 0) && (
        <p className="small muted">O resultado está negativo, por isso ficou fora da barra.</p>
      )}
    </div>
  )
}

// Régua da margem: zona de prejuízo, zona de atenção e zona viável, com o ponto atual
export function MarginRuler({ margem, min, active }) {
  const lo = Math.min(-0.1, (margem ?? 0) - 0.03)
  const hi = Math.max(0.3, (margem ?? 0) + 0.05, min + 0.1)
  const pos = (v) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100
  const zero = pos(0)
  const minP = pos(min)
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-track">
        <span className="zone zone-bad" style={{ left: 0, width: zero + '%' }} />
        <span className="zone zone-warn" style={{ left: zero + '%', width: minP - zero + '%' }} />
        <span className="zone zone-ok" style={{ left: minP + '%', width: 100 - minP + '%' }} />
        {active && <span className="ruler-mark" style={{ left: pos(margem) + '%' }} />}
      </div>
      <div className="ruler-scale">
        <span style={{ left: zero + '%' }}>0%</span>
        <span style={{ left: minP + '%' }}>mín. {pct(min, 0)}</span>
      </div>
    </div>
  )
}

// Barra fina de margem para tabelas
export function MiniMargin({ margem, min }) {
  if (margem === null || margem === undefined || !Number.isFinite(margem)) return null
  const kind = margem >= min ? 'ok' : margem >= 0 ? 'warn' : 'bad'
  const w = Math.min(Math.abs(margem) / 0.4, 1) * 100
  return (
    <span className={`mini-margin mm-${kind}`} aria-hidden="true">
      <span style={{ width: w + '%' }} />
    </span>
  )
}
