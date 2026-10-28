import { useEffect } from 'react'
import { CircleCheck, CircleAlert, CircleX, Clock3, X } from './icons'

const ICONS = { ok: CircleCheck, warn: CircleAlert, bad: CircleX, pending: Clock3 }

export function Status({ kind = 'pending', children, size = 'sm' }) {
  const Icon = ICONS[kind] || Clock3
  return (
    <span className={`status status-${kind} status-${size}`}>
      <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" strokeWidth={2.2} />
      <span>{children}</span>
    </span>
  )
}

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="panel-sub">{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHead({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Stat({ label, value, note, tone }) {
  return (
    <div className={`stat${tone ? ' tone-' + tone : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <span className="stat-note">{note}</span>}
    </div>
  )
}

export function Sheet({ open, onClose, title, children, size, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className={`sheet-backdrop${size ? ' sheet-' + size + '-wrap' : ''}`} onClick={onClose}>
      <div className={`sheet${size ? ' sheet-' + size : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

// Indicação de onde veio um valor preenchido automaticamente
export function FonteTag({ fonte, onClick }) {
  if (!fonte) return null
  let txt
  if (fonte.url) txt = 'Fonte: ' + (fonte.titulo || hostOf(fonte.url))
  else if (fonte.origem === 'conhecimento') txt = 'Estimativa da IA (fora do edital) — confirme'
  else txt = `Fonte: ${fonte.arquivo || 'documento'}${fonte.pagina ? `, p. ${fonte.pagina}` : ''}`
  return (
    <button type="button" className={`fonte-tag${fonte.origem === 'conhecimento' ? ' is-estimate' : ''}`} onClick={onClick} title={fonte.trecho || ''}>
      {txt}
    </button>
  )
}

export const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function KV({ rows }) {
  return (
    <dl className="kv">
      {rows.map(([k, v, tone]) => (
        <div key={k} className={tone ? 'tone-' + tone : ''}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
