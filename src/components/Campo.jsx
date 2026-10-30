import { useEffect, useState } from 'react'
import { CAPITAIS, FORMULA, LISTA_UFS, NOMES_DESTINO, OBRIG, tipoDe } from '../config/regras.js'
import { avaliarExpressao, fmtNum, mascaraCNPJ, parseNumBR, vazio } from '../lib/formato.js'
import { validar } from '../lib/validacao.js'

// Campo numérico com digitação livre no padrão brasileiro; grava número ao validar
function Numero({ id, valor, onChange, fator = 1, casas = 2, placeholder, disabled, onErro }) {
  const exibir = (v) => (typeof v === 'number' && isFinite(v) ? fmtNum(v * fator, casas + 2) : '')
  const [txt, setTxt] = useState(exibir(valor))
  const [foco, setFoco] = useState(false)
  useEffect(() => { if (!foco) setTxt(exibir(valor)) }, [valor, foco]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input
      id={id}
      className="ctrl num"
      inputMode="decimal"
      value={txt}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFoco(true)}
      onBlur={() => { setFoco(false); onErro(null) }}
      onChange={(e) => {
        const t = e.target.value
        setTxt(t)
        if (!t.trim()) { onErro(null); onChange(''); return }
        const n = parseNumBR(t)
        if (isFinite(n)) { onErro(null); onChange(n / fator) }
        else onErro('Use apenas números, ex.: 1.234,56')
      }}
    />
  )
}

export function Controle({ campo, valor, padrao, onChange, id, onErro = () => {} }) {
  const t = tipoDe(campo)
  const ph = !vazio(padrao) ? `Automático: ${typeof padrao === 'number' ? fmtNum(padrao) : padrao}` : campo.exemplo && !campo.exemplo.startsWith('Fórmula') ? `Ex.: ${campo.exemplo}` : ''

  if (campo.especial === 'municipio-uf') {
    const m = /^(.*?)(?:\/([A-Z]{2}))?$/.exec(String(valor || ''))
    const mun = m?.[1] || '', uf = m?.[2] || ''
    const junta = (a, b) => onChange(a || b ? `${a.replace(/^\s+/, '')}${b ? '/' + b : ''}` : '')
    return (
      <div className="duplo">
        <input id={id} className="ctrl" value={mun} placeholder="Município" autoComplete="off"
          onChange={(e) => junta(e.target.value.replace(/\//g, ''), uf)} />
        <select id={id + '-uf'} aria-label="UF" value={uf} onChange={(e) => junta(mun, e.target.value)}>
          <option value="">UF</option>
          {LISTA_UFS.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
    )
  }
  if (t === 'lista' || campo.especial === 'uf' || campo.especial === 'capital') {
    const ops = campo.especial === 'uf' ? LISTA_UFS : campo.especial === 'capital' ? CAPITAIS : campo.opcoes
    return (
      <select id={id} value={valor ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{!vazio(padrao) ? `Automático: ${padrao}` : 'Selecione…'}</option>
        {ops.map((o) => <option key={o}>{o}</option>)}
      </select>
    )
  }
  if (campo.especial === 'cnpj') {
    return <input id={id} className="ctrl num" inputMode="numeric" placeholder="00.000.000/0000-00" value={valor ?? ''}
      onChange={(e) => onChange(mascaraCNPJ(e.target.value))} />
  }
  switch (t) {
    case 'data':
      return <input id={id} type="date" className="ctrl" value={valor ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'hora':
      return <input id={id} type="time" className="ctrl" value={valor ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'moeda':
      return <div className="prefixo"><span>R$</span><Numero id={id} valor={valor} onChange={onChange} onErro={onErro} placeholder={ph.replace('Automático: ', 'Auto: ')} /></div>
    case 'numero':
      return <Numero id={id} valor={valor} onChange={onChange} onErro={onErro} placeholder={ph} />
    case 'percentual':
      return <div className="sufixo"><Numero id={id} valor={valor} fator={100} onChange={onChange} onErro={onErro} placeholder={!vazio(padrao) ? `Auto: ${fmtNum(padrao * 100)}` : ph.replace(/^Ex\.: /, 'Ex.: ')} /><span>%</span></div>
    case 'moeda-ou-sigiloso': {
      const sig = valor === 'Sigiloso'
      return (
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="prefixo"><span>R$</span><Numero id={id} valor={sig ? '' : valor} disabled={sig} onChange={onChange} onErro={onErro} placeholder={sig ? 'Sigiloso' : ''} /></div>
          <label className="sigilo"><input type="checkbox" id={id + '-sig'} checked={sig} onChange={(e) => onChange(e.target.checked ? 'Sigiloso' : '')} /> Sigiloso / sem valor publicado</label>
        </div>
      )
    }
    case 'expressao':
      return <input id={id} className="ctrl num" value={valor ?? ''} placeholder={ph || 'Ex.: 120 ou =2920/12'} onChange={(e) => onChange(e.target.value)} />
    case 'texto-longo':
      return <textarea id={id} value={valor ?? ''} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
    default:
      return <input id={id} className={'ctrl' + (!vazio(padrao) ? ' auto' : '')} value={valor ?? ''} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
  }
}

export default function Campo({ campo, valor, padrao, onChange, id, largo }) {
  const [erroDigitacao, setErroDigitacao] = useState(null)
  const erro = erroDigitacao || validar(campo, valor)
  const t = tipoDe(campo)
  const calc = t === 'expressao' && !vazio(valor) && isFinite(avaliarExpressao(valor)) ? `= ${fmtNum(avaliarExpressao(valor))}` : null
  const largoAuto = largo || t === 'texto-longo'
  return (
    <div className={'campo' + (erro ? ' erro' : '') + (largoAuto ? ' largo' : '')}>
      <div className="campo-rot">
        <label htmlFor={id}>{campo.parametro}{OBRIG(campo) && <span className="req" title="Obrigatório"> *</span>}</label>
      </div>
      <div className="meta">
        <span className="chip cel" title="Célula no modelo Excel">{campo.bloco}!{campo.celula}</span>
        {FORMULA(campo) && <span className="chip">fórmula padrão</span>}
        {!OBRIG(campo) && !FORMULA(campo) && <span className="chip">{campo.preenchimento.toLowerCase()}</span>}
        {campo.destinos.map((d) => <span key={d} className="chip dest" title="Tela alimentada por este campo">→ {NOMES_DESTINO[d] || d}</span>)}
      </div>
      <Controle campo={campo} valor={valor} padrao={padrao} onChange={onChange} id={id} onErro={setErroDigitacao} />
      {calc && <span className="ajuda calc">{calc}</span>}
      {erro ? <span className="msg-erro" role="alert">{erro}</span> : campo.observacao ? <span className="ajuda">{campo.observacao}</span> : null}
    </div>
  )
}
