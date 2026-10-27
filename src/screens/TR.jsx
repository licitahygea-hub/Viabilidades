import { Plus, Trash2, ArrowUp, ArrowDown, ArrowRightLeft } from '../components/icons'
import { newTrItem, newItem } from '../lib/model'
import { computeTrItem } from '../lib/calc'
import { money, num } from '../lib/format'
import { Field } from '../components/fields'
import { Panel, PageHead, Status, Empty } from '../components/ui'

export default function TR({ p, api }) {
  const rows = p.tr.map(computeTrItem)
  const totHoras = rows.reduce((a, r) => a + r.horas, 0)
  const totMensal = rows.reduce((a, r) => a + r.valorMensal, 0)
  const totTR = rows.reduce((a, r) => a + (Number.isFinite(r.valorTR) ? r.valorTR : 0), 0)
  const prontos = rows.filter((r) => r.profissional && r.profissional.trim())

  const levarParaMargem = () => {
    if (!prontos.length) return
    const temItens = p.itens.some((i) => i.descricao && i.descricao.trim())
    if (temItens && !window.confirm('A aba Margem já tem itens. Substituir pelos itens do TR?\n\nOs valores a pagar já preenchidos serão perdidos.')) return
    const itens = prontos.map((r) => ({
      ...newItem(),
      descricao: r.profissional + (r.local ? ' — ' + r.local : ''),
      unidade: 'Hora',
      qtd: Math.round(r.horas * 100) / 100,
      estUnit: Number.isFinite(r.valorHora) ? r.valorHora : null,
    }))
    api.setField('itens', itens)
    api.go('margem')
  }

  return (
    <div className="stack">
      <PageHead title="Termo de referência">Transcreva o quadro de itens do TR ou da proposta comercial do edital. As horas por mês são calculadas pela regra de conversão.</PageHead>

      <div className="totals-bar">
        <div><small>Horas/mês</small><strong>{num(totHoras, 2)}</strong></div>
        <div><small>Valor mensal calculado</small><strong>{money(totMensal)}</strong></div>
        <div><small>Valor mensal no TR</small><strong>{money(totTR || null)}</strong></div>
      </div>

      {rows.length === 0 && <Empty title="Nenhum item no TR">Adicione o primeiro profissional do quadro.</Empty>}

      <ol className="cards">
        {rows.map((r, i) => (
          <li key={r.id} className="card">
            <div className="card-head">
              <span className="card-num">{i + 1}</span>
              <strong className="card-title">{r.profissional || 'Profissional não informado'}</strong>
              {r.confere && <Status kind={r.confere.kind}>{r.confere.label}</Status>}
              <div className="card-tools">
                <button className="icon-btn" aria-label="Mover para cima" disabled={i === 0} onClick={() => api.listMove('tr', r.id, -1)}><ArrowUp size={16} /></button>
                <button className="icon-btn" aria-label="Mover para baixo" disabled={i === rows.length - 1} onClick={() => api.listMove('tr', r.id, 1)}><ArrowDown size={16} /></button>
                <button className="icon-btn danger" aria-label="Remover item" onClick={() => api.listRemove('tr', r.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="form-grid tight">
              <Field label="Profissional / serviço" value={r.profissional} onChange={(v) => api.listUpdate('tr', r.id, { profissional: v })} />
              <Field label="Local / unidade" value={r.local} onChange={(v) => api.listUpdate('tr', r.id, { local: v })} />
              <Field label="Carga informada (texto do TR)" value={r.cargaTexto} onChange={(v) => api.listUpdate('tr', r.id, { cargaTexto: v })} wide />
              <Field label="Base da carga" type="select" list="BaseCarga" value={r.base} onChange={(v) => api.listUpdate('tr', r.id, { base: v || 'h/mês' })} />
              <Field label="Qtd informada" type="number" value={r.qtd} onChange={(v) => api.listUpdate('tr', r.id, { qtd: v })} />
              <Field label="Nº de profissionais" type="int" value={r.nProf} onChange={(v) => api.listUpdate('tr', r.id, { nProf: v })} />
              <Field label="Valor hora estimado" type="money" value={r.valorHora} onChange={(v) => api.listUpdate('tr', r.id, { valorHora: v })} />
              <Field label="Valor mensal no TR" type="money" value={r.valorTR} onChange={(v) => api.listUpdate('tr', r.id, { valorTR: v })} />
            </div>
            <div className="card-results">
              <div><small>Horas/mês</small><strong>{num(r.horas, 2)}</strong></div>
              <div><small>Valor mensal calculado</small><strong>{money(r.valorMensal)}</strong></div>
            </div>
          </li>
        ))}
      </ol>

      <div className="row-actions">
        <button className="btn" onClick={() => api.listAdd('tr', newTrItem())}><Plus size={18} /> Adicionar item</button>
        <button className="btn btn-primary" disabled={!prontos.length} onClick={levarParaMargem}><ArrowRightLeft size={18} /> Levar itens para a Margem</button>
      </div>

      <Panel title="Regra de conversão">
        <p className="small muted prose">
          h/dia → × 365/12 (24h = 730 h/mês). h/semana → × 52/12 (40h = 173,33 h/mês). Plantões → × 12 ou × 24.
          Multiplique pelo nº de profissionais só quando a carga do TR for por profissional; se o quadro já trouxer o total do item, deixe 1.
        </p>
      </Panel>

      <Panel title="Transcrição e observações do TR">
        <textarea className="big-text" rows={6} value={p.trObs || ''} onChange={(e) => api.setField('trObs', e.target.value)} aria-label="Transcrição e observações do TR" />
      </Panel>
    </div>
  )
}
