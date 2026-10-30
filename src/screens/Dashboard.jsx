import { useMemo } from 'react'
import { analisar, rotuloProcesso, valor, CAMPO } from '../lib/calculos.js'
import { fmtData, fmtMoeda, fmtMoedaCurta, fmtPct } from '../lib/formato.js'

const corMargem = (m, min) => (m === null ? 'var(--ink-3)' : m < 0 ? 'var(--bad)' : m < min ? 'var(--warn)' : 'var(--ok)')

export default function Dashboard({ processos, filtros, setFiltros, abrir }) {
  const base = useMemo(() => processos.map((p) => ({ p, a: analisar(p), data: valor(p, CAMPO.data) || '' })), [processos])

  // Opções dos filtros vêm do cadastro de clientes (Município/UF da tela Cliente)
  const ufs = [...new Set(base.map((b) => b.a.uf).filter(Boolean))].sort()
  const municipios = [...new Set(base.filter((b) => !filtros.uf || b.a.uf === filtros.uf).map((b) => b.a.municipio).filter(Boolean))]
    .sort((x, y) => x.localeCompare(y, 'pt-BR'))

  const filtrados = base.filter((b) => (!filtros.uf || b.a.uf === filtros.uf) && (!filtros.municipio || b.a.municipio === filtros.municipio))
  const linhas = filtrados
    .flatMap(({ p, a, data }) =>
      (a.itens.length ? a.itens : [null]).map((it) => ({
        chave: p.id + (it?._id || ''), p, a, data,
        especialidade: it?.descricao || '—',
        valorHora: it?.valorHora ?? null,
        unidade: it?.unidade,
        valorGlobal: it ? it.fat * a.vigencia : null,
        margem: it ? it.margem : null,
        arrematante: a.arrematante,
      })),
    )
    .sort((x, y) => (x.data || '9999').localeCompare(y.data || '9999'))

  const fat = filtrados.reduce((s, b) => s + b.a.fat, 0)
  const res = filtrados.reduce((s, b) => s + (b.a.fat ? b.a.resultado : 0), 0)
  const global = filtrados.reduce((s, b) => s + b.a.valorGlobal, 0)
  const hoje = new Date().toISOString().slice(0, 10)
  const proxima = filtrados.filter((b) => b.data >= hoje).sort((x, y) => x.data.localeCompare(y.data))[0]
  const arrematadas = filtrados.filter((b) => b.a.arrematante).length
  const margemMin = filtrados[0]?.a.margemMin ?? 0.06

  return (
    <>
      <header className="cab">
        <div className="cab-txt">
          <span className="eyebrow">Visão geral</span>
          <h1>Dashboard de licitações</h1>
          <p>Uma linha por especialidade. Toque numa linha para abrir a tela Margem do processo.</p>
        </div>
      </header>

      <div className="filtros" role="search">
        <div className="campo">
          <label htmlFor="flt-uf">Estado</label>
          <select id="flt-uf" value={filtros.uf} onChange={(e) => setFiltros({ uf: e.target.value, municipio: '' })}>
            <option value="">Todos os estados</option>
            {ufs.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="flt-mun">Município</label>
          <select id="flt-mun" value={filtros.municipio} onChange={(e) => setFiltros({ ...filtros, municipio: e.target.value })}>
            <option value="">Todos os municípios</option>
            {municipios.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        {(filtros.uf || filtros.municipio) && <button type="button" className="btn" onClick={() => setFiltros({ uf: '', municipio: '' })}>Limpar filtros</button>}
      </div>

      <div className="kpis">
        <div className="kpi destaque"><span>Processos</span><b>{filtrados.length}</b><small>{linhas.filter((l) => l.especialidade !== '—').length} especialidades · {arrematadas} com arrematante</small></div>
        <div className="kpi"><span>Valor global</span><b>{fmtMoedaCurta(global)}</b><small>Soma do nosso preço na vigência</small></div>
        <div className="kpi"><span>Margem média</span><b style={{ color: corMargem(fat ? res / fat : null, margemMin) }}>{fmtPct(fat ? res / fat : null, 1)}</b><small>Ponderada pelo faturamento</small></div>
        <div className="kpi"><span>Próxima abertura</span><b>{proxima ? fmtData(proxima.data) : '—'}</b><small>{proxima ? rotuloProcesso(proxima.p) : 'Sem sessões futuras'}</small></div>
      </div>

      {linhas.length === 0 ? (
        <div className="painel vazio-estado">Nenhum processo para os filtros escolhidos.</div>
      ) : (
        <>
          <div className="tabela-wrap so-desktop">
            <table className="tab">
              <thead>
                <tr><th>Data abertura</th><th>Município/UF</th><th>Especialidade</th><th className="n">Valor hora</th><th className="n">Valor global</th><th>Margem</th><th>Empresa arrematante</th></tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.chave} className="clicavel" onClick={() => abrir(l.p.id)}>
                    <td className="n">{fmtData(l.data)}</td>
                    <td>{l.a.municipio ? `${l.a.municipio}/${l.a.uf}` : '—'}</td>
                    <td>{l.especialidade}</td>
                    <td className="n">{fmtMoeda(l.valorHora)}</td>
                    <td className="n">{fmtMoeda(l.valorGlobal)}</td>
                    <td><BarraMargem m={l.margem} min={l.a.margemMin} /></td>
                    <td>{l.arrematante || <span className="pill neutro">Em disputa</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cartoes so-celular">
            {linhas.map((l) => (
              <button type="button" key={l.chave} className="cartao" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => abrir(l.p.id)}>
                <div className="linha-info"><span className="num">{fmtData(l.data)}</span><span>{l.a.municipio ? `${l.a.municipio}/${l.a.uf}` : '—'}</span></div>
                <h3>{l.especialidade}</h3>
                <div className="par"><span>Valor hora</span><b>{fmtMoeda(l.valorHora)}</b></div>
                <div className="par"><span>Valor global</span><b>{fmtMoeda(l.valorGlobal)}</b></div>
                <div className="par"><span>Margem</span><BarraMargem m={l.margem} min={l.a.margemMin} /></div>
                <div className="par"><span>Arrematante</span><b style={{ fontFamily: 'var(--f-body)' }}>{l.arrematante || 'Em disputa'}</b></div>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="rodape-info">Valor hora = valor unitário proposto convertido para hora (plantões de 12h e 24h divididos pelas horas). Unidades “Consulta” e “Mensal” não têm valor hora.</p>
    </>
  )
}

function BarraMargem({ m, min }) {
  const cor = corMargem(m, min)
  const w = m === null ? 0 : Math.max(2, Math.min(100, (Math.abs(m) / 0.3) * 100))
  return (
    <span className="mbar" title={m === null ? 'Sem preço informado' : `Mínimo ${fmtPct(min, 1)}`}>
      <i><em style={{ width: w + '%', background: cor }} /></i>
      <span className="num" style={{ color: cor, textAlign: 'right' }}>{fmtPct(m, 1)}</span>
    </span>
  )
}
