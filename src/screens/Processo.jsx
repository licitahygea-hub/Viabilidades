import { PROCESSO_SECTIONS } from '../lib/model'
import { money, pctSigned } from '../lib/format'
import { Field } from '../components/fields'
import { Panel, PageHead } from '../components/ui'

export default function Processo({ p, c, api }) {
  const computed = {
    _estimadoMensal: money(c.estMensal),
    _contratoMensal: money(c.contratoMensal || null),
    _vsContrato: pctSigned(c.vsContrato),
  }
  return (
    <div className="stack">
      <PageHead title="Dados do processo">Resumo do edital, contrato atual, pesquisa de preço e comitê.</PageHead>
      {PROCESSO_SECTIONS.map((s) => (
        <Panel key={s.title} title={s.title}>
          <div className="form-grid">
            {s.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                hint={f.hint}
                type={f.type}
                list={f.list}
                wide={f.wide}
                value={p.processo[f.key]}
                computed={computed[f.key]}
                onChange={(v) => api.setProcesso(f.key, v)}
              />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  )
}
