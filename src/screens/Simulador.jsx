import { descontosLista } from '../lib/calc'
import { money, money0, pct } from '../lib/format'
import { Field } from '../components/fields'
import { Panel, PageHead, Status, KV } from '../components/ui'
import { MiniMargin } from '../components/charts'

export default function Simulador({ p, c, api }) {
  const s = p.simulador
  const setSim = (k) => (v) => api.set((pp) => ({ ...pp, simulador: { ...pp.simulador, [k]: v } }))
  const rows = descontosLista(s.passo, s.ate).map(c.simular)
  const teste = c.testarLance(s.lanceTeste)
  const L = c.limites

  return (
    <div className="stack">
      <PageHead title="Simulador de lances">Quanto de desconto sobre o estimado ainda é viável, com os custos da aba Margem.</PageHead>

      <div className="grid-2">
        <Panel title="Limites (da aba Margem)">
          <KV
            rows={[
              ['Lance limite global (margem mín.)', money(L.lanceLimiteGlobal)],
              ['Desconto máximo s/ estimado', pct(L.lanceLimiteDesconto, 2)],
              ['Ponto de equilíbrio global', money(L.equilibrioGlobal)],
            ]}
          />
        </Panel>
        <Panel title="Testar um lance específico">
          <div className="form-grid">
            <Field label="Valor global do lance" type="money" value={s.lanceTeste} onChange={setSim('lanceTeste')} wide />
          </div>
          {teste && (
            <>
              <KV
                rows={[
                  ['Desconto s/ estimado', pct(teste.desconto, 2)],
                  ['Valor mensal', money(teste.mensal)],
                  ['Resultado mensal', money(teste.res)],
                  ['Margem', pct(teste.margem, 2)],
                ]}
              />
              <div className="kv-status"><span>Situação</span><Status kind={teste.sit.kind}>{teste.sit.label}</Status></div>
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="Tabela de descontos"
        actions={
          <div className="inline-fields">
            <Field label="Passo" type="percent" value={s.passo} onChange={setSim('passo')} decimals={2} />
            <Field label="Até" type="percent" value={s.ate} onChange={setSim('ate')} decimals={2} />
          </div>
        }
      >
        <div className="table-wrap">
          <table className="table sim-table">
            <thead>
              <tr>
                <th className="num">Desconto</th>
                <th className="num">Valor global</th>
                <th className="num hide-sm">Valor mensal</th>
                <th className="num hide-sm">Tributos</th>
                <th className="num hide-sm">Custos</th>
                <th className="num hide-sm">Resultado mensal</th>
                <th className="num">Margem</th>
                <th className="sit-cell">Situação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.desconto} className={`row-${r.sit.kind}`}>
                  <td className="num">{pct(r.desconto, 1)}</td>
                  <td className="num">{money0(r.global)}</td>
                  <td className="num hide-sm">{money0(r.mensal)}</td>
                  <td className="num hide-sm">{money0(r.trib)}</td>
                  <td className="num hide-sm">{money0(r.custos)}</td>
                  <td className="num hide-sm">{money0(r.res)}</td>
                  <td className="num">
                    <span className="margin-cell">{pct(r.margem, 1)}<MiniMargin margem={c.custoMensal ? r.margem : null} min={c.min} /></span>
                  </td>
                  <td className="sit-cell"><Status kind={r.sit.kind}>{r.sit.label}</Status></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted only-mobile">Gire o celular ou use um computador para ver todas as colunas.</p>
      </Panel>
    </div>
  )
}
