import { useState } from 'react'
import { PROCESSO_SECTIONS } from '../lib/model'
import { money, pctSigned } from '../lib/format'
import { sugerirDataComite, dataLonga, isPast, fromISO, DIAS_COMITE } from '../lib/comite'
import { Field } from '../components/fields'
import { Panel, PageHead } from '../components/ui'
import Especialidades from '../components/Especialidades'
import EmpresaAtual from '../components/EmpresaAtual'
import FonteSheet from '../components/FonteSheet'

export default function Processo({ p, c, api }) {
  const P = p.processo
  const [fonte, setFonte] = useState(null)
  const computed = {
    _estimadoMensal: money(c.estMensal),
    _contratoMensal: money(c.contratoMensal || null),
    _vsContrato: pctSigned(c.vsContrato),
  }

  // Sugestão do comitê (terças e quintas, antes da disputa)
  const sug = sugerirDataComite(P.dataSessao)
  let comiteHint
  if (!P.dataSessao) comiteHint = 'Preencha a data da sessão para sugerir a terça ou quinta anterior à disputa.'
  else if (sug) {
    const avisos = []
    const prev = fromISO(P.comiteDataPrevista)
    if (prev && !DIAS_COMITE.includes(prev.getDay())) avisos.push('A data escolhida não é terça nem quinta.')
    if (P.comiteDataPrevista && P.comiteDataPrevista >= P.dataSessao) avisos.push('A data está no dia da disputa ou depois.')
    if (P.comiteDataPrevista && isPast(P.comiteDataPrevista) && P.statusComite !== 'Concluído') avisos.push('Essa data já passou.')
    comiteHint =
      P.comiteDataPrevista === sug ? (
        <>Sugestão automática: {dataLonga(sug)}. {avisos.join(' ')}</>
      ) : (
        <>
          Sugestão: {dataLonga(sug)}.{' '}
          <button type="button" className="link" onClick={() => api.patchProcesso({ comiteDataPrevista: sug, comiteAuto: true, _comiteAuto: true })}>
            Usar sugestão
          </button>{' '}
          {avisos.join(' ')}
        </>
      )
  }
  const hints = { comiteDataPrevista: comiteHint }

  const verFonte = (label, key) => setFonte({ label, fonte: p.fontes?.[key] })
  const temDocs = !!p.extracao

  return (
    <div className="stack">
      <PageHead title="Dados do processo">Resumo do edital, contrato atual, pesquisa de preço e comitê.</PageHead>
      {!temDocs && (
        <div className="notice">
          <span>Anexe o edital no Painel para a IA preencher esta aba e indicar a página de cada dado.</span>
          <button className="link" onClick={() => api.go('painel')}>Ir para o Painel</button>
        </div>
      )}
      {PROCESSO_SECTIONS.map((s) => (
        <Panel key={s.title} title={s.title}>
          {s.id === 'empresa' && <EmpresaAtual p={p} api={api} />}
          <div className="form-grid">
            {s.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                hint={hints[f.key] ?? f.hint}
                type={f.type}
                list={f.list}
                wide={f.wide}
                value={P[f.key]}
                computed={computed[f.key]}
                fonte={p.fontes?.[f.key]}
                onFonte={() => verFonte(f.label, f.key)}
                onChange={(v) => api.setProcesso(f.key, v)}
              />
            ))}
          </div>
          {s.id === 'equipe' && (
            <div className="sub-block">
              <h3>Especialidades licitadas</h3>
              <Especialidades value={P.especialidades || []} fontes={p.fontes} onChange={(v) => api.setProcesso('especialidades', v)} />
            </div>
          )}
        </Panel>
      ))}
      {fonte?.fonte && <FonteSheet procId={p.id} info={fonte} onClose={() => setFonte(null)} />}
    </div>
  )
}
