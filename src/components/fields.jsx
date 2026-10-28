import { useEffect, useId, useState } from 'react'
import { parseBR, toEditText } from '../lib/format'
import { LISTS } from '../lib/lists'
import { FonteTag } from './ui'

// Campo numérico com digitação em pt-BR (vírgula decimal)
export function NumInput({ value, onChange, kind = 'number', decimals, placeholder, id, ariaLabel }) {
  const dec = decimals ?? (kind === 'int' ? 0 : kind === 'percent' ? 2 : 2)
  const minDec = kind === 'money' ? 2 : 0
  const show = (v) => (v === null || v === undefined ? '' : toEditText(kind === 'percent' ? v * 100 : v, dec, minDec))
  const [text, setText] = useState(show(value))
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    if (!focus) setText(show(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focus])

  return (
    <div className={`num-input kind-${kind}`}>
      {kind === 'money' && <span className="affix">R$</span>}
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocus(true)
          requestAnimationFrame(() => e.target.select())
        }}
        onBlur={() => setFocus(false)}
        onChange={(e) => {
          setText(e.target.value)
          const parsed = parseBR(e.target.value)
          onChange(parsed === null ? null : kind === 'percent' ? parsed / 100 : parsed)
        }}
      />
      {kind === 'percent' && <span className="affix">%</span>}
    </div>
  )
}

export function Select({ value, onChange, list, options, id, ariaLabel, placeholder = 'Selecione' }) {
  const opts = options || LISTS[list] || []
  const hasValue = value !== undefined && value !== null && value !== ''
  return (
    <select id={id} aria-label={ariaLabel} className={hasValue ? '' : 'is-empty'} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      {hasValue && !opts.includes(value) && <option value={value}>{value}</option>}
    </select>
  )
}

// Campo genérico com rótulo
export function Field({ label, hint, type = 'text', value, onChange, list, wide, computed, placeholder, decimals, fonte, onFonte }) {
  const id = useId()
  let control
  if (type === 'computed') {
    control = <output id={id} className="computed">{computed}</output>
  } else if (['money', 'percent', 'number', 'int'].includes(type)) {
    control = <NumInput id={id} kind={type} value={value} onChange={onChange} placeholder={placeholder} decimals={decimals} />
  } else if (type === 'select') {
    control = <Select id={id} value={value} onChange={onChange} list={list} />
  } else if (type === 'textarea') {
    control = <textarea id={id} rows={3} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  } else {
    control = (
      <input
        id={id}
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || (type === 'text' ? '' : null))}
      />
    )
  }
  return (
    <div className={`field${wide ? ' wide' : ''}${type === 'computed' ? ' is-computed' : ''}${fonte ? ' has-fonte' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <small className="hint">{hint}</small>}
      {fonte && <FonteTag fonte={fonte} onClick={onFonte} />}
    </div>
  )
}
