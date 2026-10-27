import { Plus, Trash2, ArrowUp, ArrowDown, ArrowDownWideNarrow } from '../components/icons'
import { newConcorrente } from '../lib/model'
import { money, pct } from '../lib/format'
import { Field } from '../components/fields'
import { PageHead, Status, Empty, KV, Panel } from '../components/ui'

export default function Concorrentes({ p, c, api }) {
  const ordenar = () =>
    api.set((pp) => ({
      ...pp,
      concorrentes: [...pp.concorrentes].sort((a, b) => (Number.isFinite(a.valorGlobal) ? a.valorGlobal : Infinity) - (Number.isFinite(b.valorGlobal) ? b.valorGlobal : Infinity)),
    }))

  const margemKind = (m) => (m === null ? 'pending' : m >= c.min ? 'ok' : m >= 0 ? 'warn' : 'bad')

  return (
    <div className="stack">
      <PageHead title="Concorrentes">Registre lances e propostas. A margem mostra se conseguiríamos cobrir cada valor com os nossos custos.</PageHead>

      <Panel>
        <KV
          rows={[
            ['Valor estimado global', money(c.estGlobal || null)],
            ['Vigência', c.vig + ' meses'],
            ['Nosso lance limite (global)', money(c.limites.lanceLimiteGlobal)],
            ['Melhor preço concorrente', money(c.melhorConcorrente)],
          ]}
        />
        <div className="kv-status"><span>Conseguimos cobrir o melhor preço?</span><Status kind={c.cobre.kind}>{c.cobre.label}</Status></div>
      </Panel>

      {c.concorrentes.length === 0 && <Empty title="Nenhum concorrente registrado">Adicione as empresas conforme a disputa avança.</Empty>}

      <ol className="cards">
        {c.concorrentes.map((r, i) => (
          <li key={r.id} className="card">
            <div className="card-head">
              <span className="card-num">{r.pos}º</span>
              <strong className="card-title">{r.fantasia || r.razao || 'Empresa não informada'}</strong>
              {r.nossaMargem !== null && <Status kind={margemKind(r.nossaMargem)}>Nossa margem {pct(r.nossaMargem, 1)}</Status>}
              <div className="card-tools">
                <button className="icon-btn" aria-label="Subir posição" disabled={i === 0} onClick={() => api.listMove('concorrentes', r.id, -1)}><ArrowUp size={16} /></button>
                <button className="icon-btn" aria-label="Descer posição" disabled={i === c.concorrentes.length - 1} onClick={() => api.listMove('concorrentes', r.id, 1)}><ArrowDown size={16} /></button>
                <button className="icon-btn danger" aria-label="Remover concorrente" onClick={() => api.listRemove('concorrentes', r.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="form-grid tight">
              <Field label="Razão social" value={r.razao} onChange={(v) => api.listUpdate('concorrentes', r.id, { razao: v })} />
              <Field label="Nome fantasia" value={r.fantasia} onChange={(v) => api.listUpdate('concorrentes', r.id, { fantasia: v })} />
              <Field label="CNPJ" value={r.cnpj} onChange={(v) => api.listUpdate('concorrentes', r.id, { cnpj: v })} />
              <Field label="Porte" type="select" list="Porte" value={r.porte} onChange={(v) => api.listUpdate('concorrentes', r.id, { porte: v })} />
              <Field label="Administrador" value={r.administrador} onChange={(v) => api.listUpdate('concorrentes', r.id, { administrador: v })} />
              <Field label="Representante" value={r.representante} onChange={(v) => api.listUpdate('concorrentes', r.id, { representante: v })} />
              <Field label="Cidade" value={r.cidade} onChange={(v) => api.listUpdate('concorrentes', r.id, { cidade: v })} />
              <Field label="UF" value={r.uf} onChange={(v) => api.listUpdate('concorrentes', r.id, { uf: v.toUpperCase().slice(0, 2) })} />
              <Field label="Valor unitário" type="money" value={r.valorUnit} onChange={(v) => api.listUpdate('concorrentes', r.id, { valorUnit: v })} />
              <Field label="Valor global" type="money" value={r.valorGlobal} onChange={(v) => api.listUpdate('concorrentes', r.id, { valorGlobal: v })} />
              <Field label="Status" type="select" list="StatusConc" value={r.status} onChange={(v) => api.listUpdate('concorrentes', r.id, { status: v })} />
              <Field label="Motivação" value={r.motivacao} onChange={(v) => api.listUpdate('concorrentes', r.id, { motivacao: v })} />
            </div>
            <dl className="card-results grid">
              <div><dt>Valor mensal</dt><dd>{money(r.mensal)}</dd></div>
              <div><dt>Desconto s/ estimado</dt><dd>{pct(r.desconto, 2)}</dd></div>
              <div><dt>Nossa margem nesse preço</dt><dd className={r.nossaMargem < 0 ? 'neg' : ''}>{pct(r.nossaMargem, 2)}</dd></div>
            </dl>
          </li>
        ))}
      </ol>

      <div className="row-actions">
        <button className="btn" onClick={() => api.listAdd('concorrentes', newConcorrente())}><Plus size={18} /> Adicionar concorrente</button>
        {c.concorrentes.length > 1 && (
          <button className="btn" onClick={ordenar}><ArrowDownWideNarrow size={18} /> Ordenar pelo menor valor</button>
        )}
      </div>
    </div>
  )
}
