import { Plus, Trash2, ArrowUp, ArrowDown } from '../components/icons'
import { newItem } from '../lib/model'
import { money, pct, num, toEditText } from '../lib/format'
import { Field } from '../components/fields'
import { Panel, PageHead, Status, Empty } from '../components/ui'
import EnviarPrecificacao from '../components/EnviarPrecificacao'

export default function Margem({ p, c, api }) {
  const L = c.limites
  const f = c.fatMensal
  const share = (x) => (f ? x / f : 0)
  const consolidated = [
    ['Faturamento', c.fatMensal],
    ['(−) Tributos', c.tribMensal],
    ['(−) Custo dos médicos', c.custoMensal],
    ['(−) Custos indiretos', c.indiretoMensal],
    ['(=) Resultado (taxa de administração)', c.resMensal],
  ]
  const setInd = (k) => (v) => api.set((pp) => ({ ...pp, indiretos: { ...pp.indiretos, [k]: v } }))

  return (
    <div className="stack">
      <PageHead title="Margem">Composição de preço e custo por item. O valor a pagar vem da pesquisa de preço. Para outro lote, duplique a viabilidade na tela inicial.</PageHead>

      <div className="totals-bar">
        <div><small>Faturamento mensal</small><strong>{money(c.fatMensal)}</strong></div>
        <div><small>Custo mensal</small><strong>{money(c.custoMensal)}</strong></div>
        <div><small>Margem total</small><strong>{c.custoMensal ? pct(c.margemTotal, 2) : '—'}</strong></div>
        <div><small>Estimado confere com o edital?</small><Status kind={c.confereEdital.kind}>{c.confereEdital.label}</Status></div>
      </div>

      {c.itens.length === 0 && <Empty title="Nenhum item">Adicione os itens ou traga-os da aba TR.</Empty>}

      <ol className="cards">
        {c.itens.map((it, i) => (
          <li key={it.id} className="card">
            <div className="card-head">
              <span className="card-num">{i + 1}</span>
              <strong className="card-title">{it.descricao || 'Descrição não informada'}</strong>
              {it.status && <Status kind={it.status.kind}>{it.status.label}</Status>}
              <div className="card-tools">
                <button className="icon-btn" aria-label="Mover para cima" disabled={i === 0} onClick={() => api.listMove('itens', it.id, -1)}><ArrowUp size={16} /></button>
                <button className="icon-btn" aria-label="Mover para baixo" disabled={i === c.itens.length - 1} onClick={() => api.listMove('itens', it.id, 1)}><ArrowDown size={16} /></button>
                <button className="icon-btn danger" aria-label="Remover item" onClick={() => api.listRemove('itens', it.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="form-grid tight">
              <Field label="Descrição (médico + especialidade)" value={it.descricao} wide onChange={(v) => api.listUpdate('itens', it.id, { descricao: v })} />
              <Field label="Unidade" type="select" list="Unidade" value={it.unidade} onChange={(v) => api.listUpdate('itens', it.id, { unidade: v })} />
              <Field label="Qtd / mês" type="number" value={p.itens[i].qtd} onChange={(v) => api.listUpdate('itens', it.id, { qtd: v })} />
              <Field label="Estimado unit. (edital)" type="money" value={p.itens[i].estUnit} onChange={(v) => api.listUpdate('itens', it.id, { estUnit: v })} />
              <Field
                label="Proposto unit."
                type="money"
                value={p.itens[i].propUnit}
                placeholder={it.est ? toEditText(it.est, 2, 2) : ''}
                hint="Vazio = igual ao estimado"
                onChange={(v) => api.listUpdate('itens', it.id, { propUnit: v })}
              />
              <Field label="A pagar unit." type="money" value={p.itens[i].pagarUnit} onChange={(v) => api.listUpdate('itens', it.id, { pagarUnit: v })} />
            </div>
            <dl className="card-results grid">
              <div><dt>Estimado mensal</dt><dd>{money(it.estMensal)}</dd></div>
              <div><dt>Faturamento mensal</dt><dd>{money(it.fat)}</dd></div>
              <div><dt>Custo mensal</dt><dd>{money(it.custo)}</dd></div>
              <div><dt>Tributos</dt><dd>{money(it.trib)}</dd></div>
              <div><dt>Resultado</dt><dd className={it.res < 0 ? 'neg' : ''}>{money(it.res)}</dd></div>
              <div><dt>Margem</dt><dd>{pct(it.margem, 2)}</dd></div>
              <div><dt>Preço unit. mínimo</dt><dd>{money(it.precoMin)}</dd></div>
              <div><dt>Desconto máx. no item</dt><dd>{pct(it.descMax, 2)}</dd></div>
            </dl>
          </li>
        ))}
      </ol>

      <div className="row-actions">
        <button className="btn" onClick={() => api.listAdd('itens', newItem())}><Plus size={18} /> Adicionar item</button>
      </div>
      <p className="small muted">Preço unitário mínimo é o menor valor do item que mantém a margem mínima de {pct(c.min, 0)}. Horas globais na vigência: {num(c.horasGlobais, 2)}.</p>

      <Panel title="Custos indiretos mensais" subtitle={c.coordHint || undefined}>
        <div className="form-grid">
          <Field label="Coordenação / RT / Diretor técnico" type="money" value={p.indiretos.coord} onChange={setInd('coord')} />
          <Field label="Outras despesas (equipamentos, insumos, EPI, alimentação)" type="money" value={p.indiretos.outras} onChange={setInd('outras')} />
          <Field label="Despesas administrativas" type="money" value={p.indiretos.adm} onChange={setInd('adm')} />
          <Field label="Total custos indiretos" type="computed" computed={money(c.indiretoMensal)} />
        </div>
      </Panel>

      <Panel title="Resultado consolidado">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th></th><th className="num">Mensal</th><th className="num">% do fat.</th><th className="num">Global (vigência)</th></tr>
            </thead>
            <tbody>
              {consolidated.map(([k, v], idx) => (
                <tr key={k} className={idx === 0 || idx === 4 ? 'strong' : ''}>
                  <td>{k}</td>
                  <td className="num">{money(v)}</td>
                  <td className="num muted">{pct(share(v), 1)}</td>
                  <td className="num">{money(v * c.vig)}</td>
                </tr>
              ))}
              <tr className="strong total"><td>Margem</td><td className="num">{pct(c.margemTotal, 2)}</td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Limites para a disputa" subtitle="Consideram o desconto aplicado igualmente em todos os itens. Sem valor a pagar, ficam em branco.">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th></th><th className="num">Mensal</th><th className="num">Desconto s/ estimado</th><th className="num">Global (vigência)</th></tr>
            </thead>
            <tbody>
              <tr><td>Valor estimado do edital</td><td className="num">{money(L.estimadoMensal)}</td><td></td><td className="num">{money(L.estimadoGlobal)}</td></tr>
              <tr><td>Nosso preço (valor mínimo de participação)</td><td className="num">{money(L.nossoMensal)}</td><td className="num">{pct(L.nossoDesconto, 2)}</td><td className="num">{money(L.nossoGlobal)}</td></tr>
              <tr className="strong"><td>Lance limite (mantém a margem mínima)</td><td className="num">{money(L.lanceLimiteMensal)}</td><td className="num">{pct(L.lanceLimiteDesconto, 2)}</td><td className="num">{money(L.lanceLimiteGlobal)}</td></tr>
              <tr><td>Ponto de equilíbrio (margem zero)</td><td className="num">{money(L.equilibrioMensal)}</td><td className="num">{pct(L.equilibrioDesconto, 2)}</td><td className="num">{money(L.equilibrioGlobal)}</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <EnviarPrecificacao p={p} c={c} api={api} />
    </div>
  )
}
