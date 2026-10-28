import { money, money0, pct, pctSigned, fmtDate } from '../lib/format'
import { Panel, Stat, Status, KV } from '../components/ui'
import { Composition, MarginRuler } from '../components/charts'
import EditalDocs from '../components/EditalDocs'

export default function Painel({ p, c, api }) {
  const P = p.processo
  const L = c.limites
  const v = c.verdict
  const active = c.fatMensal > 0 && c.custoMensal > 0

  const chips = [
    ['Empresa', P.empresa],
    ['Sessão', P.dataSessao ? fmtDate(P.dataSessao) + (P.horaSessao ? ' às ' + P.horaSessao : '') : null],
    ['Modalidade', P.modalidade],
    ['Disputa', P.modoDisputa],
    ['Vigência', c.vig + ' meses'],
  ]

  const parts = [
    { label: 'Médicos', value: c.custoMensal },
    { label: 'Tributos', value: c.tribMensal },
    { label: 'Custos indiretos', value: c.indiretoMensal },
    { label: 'Resultado', value: c.resMensal },
  ]
  const f = c.fatMensal
  const share = (x) => (f ? x / f : 0)

  return (
    <div className="stack">
      <div className="painel-id">
        <h1>{P.descritivo || <button className="link" onClick={() => api.go('processo')}>Preencha o descritivo na aba Processo</button>}</h1>
        <ul className="chips">
          {chips.map(([k, val]) => (
            <li key={k}>
              <span>{k}</span> {val || '—'}
            </li>
          ))}
        </ul>
      </div>

      <EditalDocs p={p} api={api} />

      <section className={`verdict verdict-${v.kind}`} aria-live="polite">
        <div className="verdict-top">
          <div>
            <span className="verdict-title">{v.title}</span>
            <p className="verdict-text">{v.text}</p>
          </div>
          <div className="verdict-margin">
            <span>Margem</span>
            <strong>{active ? pct(c.margemTotal, 1) : '—'}</strong>
          </div>
        </div>
        <MarginRuler margem={c.margemTotal} min={c.min} active={active} />
        {!c.fatMensal && (
          <button className="btn btn-on-dark" onClick={() => api.go('margem')}>Ir para a Margem</button>
        )}
      </section>

      <div className="stats">
        <Stat label="Faturamento mensal" value={money0(c.fatMensal)} note={`Estimado do edital: ${money0(c.estMensal)}`} />
        <Stat label="Valor global (vigência)" value={money0(L.nossoGlobal)} note={`Estimado global: ${money0(c.estGlobal)}`} />
        <Stat label="Resultado mensal (taxa adm.)" value={money0(c.resMensal)} note={`Na vigência: ${money0(c.resMensal * c.vig)}`} tone={active ? (c.resMensal < 0 ? 'bad' : null) : null} />
        <Stat label="Desconto ofertado" value={c.estMensal && c.fatMensal ? pct(L.nossoDesconto ?? 0, 2) : '—'} note="Nosso preço vs. edital" />
      </div>

      <Panel title="Limites para a disputa" subtitle="Considera o mesmo desconto aplicado em todos os itens">
        <div className="stats stats-3">
          <Stat label="Lance limite (global)" value={money0(L.lanceLimiteGlobal)} note="Menor valor que mantém a margem mínima" tone="accent" />
          <Stat label="Desconto máximo s/ estimado" value={pct(L.lanceLimiteDesconto, 2)} note="Até onde dá para baixar na disputa" />
          <Stat label="Ponto de equilíbrio (global)" value={money0(L.equilibrioGlobal)} note="Abaixo disso, prejuízo" />
        </div>
      </Panel>

      <div className="grid-2">
        <Panel title="Como se compõe o faturamento mensal">
          <table className="table compact">
            <tbody>
              <tr className="strong"><td>Faturamento</td><td className="num">{money(f)}</td><td className="num muted">{pct(f ? 1 : 0, 1)}</td></tr>
              <tr><td>(−) Tributos</td><td className="num">{money(c.tribMensal)}</td><td className="num muted">{pct(share(c.tribMensal), 1)}</td></tr>
              <tr><td>(−) Custo dos médicos</td><td className="num">{money(c.custoMensal)}</td><td className="num muted">{pct(share(c.custoMensal), 1)}</td></tr>
              <tr><td>(−) Custos indiretos</td><td className="num">{money(c.indiretoMensal)}</td><td className="num muted">{pct(share(c.indiretoMensal), 1)}</td></tr>
              <tr className="strong total"><td>(=) Resultado</td><td className="num">{money(c.resMensal)}</td><td className="num muted">{pct(share(c.resMensal), 1)}</td></tr>
            </tbody>
          </table>
        </Panel>
        <Panel title="Para onde vai cada R$ 100 faturados">
          <Composition fat={f} parts={parts} />
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Checklist antes do comitê">
          <ul className="checklist">
            {c.checklist.map((i) => (
              <li key={i.label}>
                <span>{i.label}</span>
                <Status kind={i.kind}>{i.value}</Status>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Mercado e concorrência">
          <KV
            rows={[
              ['Contrato atual (mensal)', money(c.contratoMensal || null)],
              ['Nosso preço vs contrato atual', pctSigned(c.vsContrato)],
              ['Concorrentes registrados', String(c.nConcorrentes)],
              ['Melhor preço concorrente (global)', money(c.melhorConcorrente)],
              ['Nosso lance limite (global)', money(L.lanceLimiteGlobal)],
            ]}
          />
          <div className="kv-status">
            <span>Conseguimos cobrir o melhor preço?</span>
            <Status kind={c.cobre.kind}>{c.cobre.label}</Status>
          </div>
        </Panel>
      </div>
    </div>
  )
}
