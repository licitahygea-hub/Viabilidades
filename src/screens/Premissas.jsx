import { RotateCcw } from '../components/icons'
import { DEFAULT_PREMISSAS } from '../lib/model'
import { pct } from '../lib/format'
import { Field } from '../components/fields'
import { Panel, PageHead } from '../components/ui'

export default function Premissas({ p, c, api }) {
  const pr = p.premissas
  const set = (k) => (v) => api.setPremissa(k, v)
  return (
    <div className="stack">
      <PageHead title="Premissas">Parâmetros da empresa usados em todos os cálculos desta viabilidade.</PageHead>

      <Panel title="Tributos sobre o faturamento" subtitle="ISS: consulta no grupo do Teams. 2% é provisório até a confirmação.">
        <div className="form-grid">
          <Field label="ISS com abertura de filial (Cód. 4.01)" type="percent" value={pr.iss1} onChange={set('iss1')} />
          <Field label="ISS sem abertura de filial (Cód. 17.05)" type="percent" value={pr.iss2} onChange={set('iss2')} />
          <Field label="Status da consulta ISS" type="select" list="StatusISS" value={pr.statusISS} onChange={set('statusISS')} hint="Enquanto estiver pendente, o Painel sinaliza." />
          <Field label="ISS aplicado (o maior dos dois)" type="computed" computed={pct(c.tx.iss, 2)} />
          <Field label="PIS" type="percent" value={pr.pis} onChange={set('pis')} />
          <Field label="COFINS" type="percent" value={pr.cofins} onChange={set('cofins')} />
          <Field label="CSLL" type="percent" value={pr.csll} onChange={set('csll')} />
          <Field label="IR" type="percent" value={pr.ir} onChange={set('ir')} />
          <Field label="Carga tributária total" type="computed" computed={pct(c.carga, 2)} />
        </div>
      </Panel>

      <Panel title="Reajustes anuais (projeção)">
        <div className="form-grid">
          <Field label="Reajuste do faturamento (IPCA estimado)" type="percent" value={pr.reajFat} onChange={set('reajFat')} hint="Aplicado a partir do 2º ano." />
          <Field label="Reajuste do valor pago aos médicos" type="percent" value={pr.reajMed} onChange={set('reajMed')} hint="Aplicado a partir do 2º ano." />
          <Field
            label="Reajuste dos custos indiretos"
            type="percent"
            value={pr.reajInd}
            onChange={set('reajInd')}
            placeholder={(c.reajInd * 100).toLocaleString('pt-BR')}
            hint="Vazio = acompanha o IPCA."
          />
        </div>
      </Panel>

      <Panel title="Critérios de decisão">
        <div className="form-grid">
          <Field
            label="Margem mínima"
            type="percent"
            value={pr.margemMin}
            onChange={set('margemMin')}
            hint="Abaixo disso: atenção. Margem negativa: inviável. Também define o lance limite."
          />
        </div>
      </Panel>

      <div className="row-actions">
        <button
          className="btn"
          onClick={() => {
            if (window.confirm('Restaurar as premissas padrão nesta viabilidade?')) api.setField('premissas', { ...DEFAULT_PREMISSAS })
          }}
        >
          <RotateCcw size={18} /> Restaurar padrão
        </button>
      </div>
    </div>
  )
}
