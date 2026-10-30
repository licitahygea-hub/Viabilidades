import { NOMES_DESTINO, camposDoDestino, tipoDe } from '../config/regras.js'
import { CAMPO, analisar, efetivo, linhas, rotuloProcesso, valor } from '../lib/calculos.js'
import { avaliarExpressao, fmtData, fmtMoeda, fmtNum, fmtPct, vazio } from '../lib/formato.js'
import { cidadeCliente, nomeCliente, ufCliente } from '../lib/clientes.js'

export function fmtValor(campo, v) {
  if (vazio(v)) return null
  switch (tipoDe(campo)) {
    case 'data': return fmtData(v)
    case 'moeda': return fmtMoeda(v)
    case 'moeda-ou-sigiloso': return v === 'Sigiloso' ? 'Sigiloso' : fmtMoeda(v)
    case 'percentual': return fmtPct(v)
    case 'numero': return fmtNum(v)
    case 'expressao': return fmtNum(avaliarExpressao(v))
    default: return String(v)
  }
}

const classeSituacao = { Viável: 'ok', Atenção: 'warn', Inviável: 'bad', 'Sem dados': 'neutro' }
const classeStatus = (s) => (s === 'Acima do mínimo' ? 'ok' : s === 'Prejuízo' ? 'bad' : s === 'Abaixo do mínimo' ? 'warn' : 'neutro')

export default function TelaDestino({ destino, proc, analise, processos, clientes = [], irPara, selecionar }) {
  const campos = camposDoDestino(destino)
  const origens = [...new Set(campos.map((c) => c.bloco))]
  const porBloco = origens.map((b) => [b, campos.filter((c) => c.bloco === b)])
  const nome = NOMES_DESTINO[destino] || destino

  return (
    <>
      <header className="cab">
        <div className="cab-txt">
          <span className="eyebrow">Tela alimentada automaticamente (de/para)</span>
          <h1>{destino === 'agenda' ? 'Agenda' : 'Tela ' + nome}</h1>
          <p>Recebe {campos.length} campos das abas {origens.join(', ')}. Para alterar um valor, edite-o no cadastro de origem.</p>
        </div>
      </header>

      {destino === 'margem' && <ResumoMargem a={analise} />}
      {destino === 'agenda' && <AgendaGeral processos={processos} atualId={proc.id} selecionar={selecionar} />}
      {destino === 'cliente' && <ClientesCadastrados processos={processos} clientes={clientes} atual={proc} irPara={irPara} />}

      {porBloco.map(([bloco, cs]) => {
        const simples = cs.filter((c) => !c.repete)
        const repet = cs.filter((c) => c.repete)
        const grupo = repet[0]?.grupo
        const rows = grupo ? linhas(proc, grupo) : []
        return (
          <section key={bloco} className="painel">
            <div className="painel-cab">
              <h2>Dados vindos de {bloco}</h2>
              <button type="button" className="link" onClick={() => irPara('bloco-' + bloco)}>Editar em {bloco}</button>
            </div>
            <div className="painel-corpo">
              {simples.length > 0 && (
                <dl className="dl">
                  {simples.map((c) => {
                    const e = efetivo(proc, analise, c)
                    const f = fmtValor(c, e.valor)
                    return (
                      <div key={c.id}>
                        <dt>{c.parametro} <span className="origem mono">· {c.bloco}!{c.celula}</span></dt>
                        <dd className={f ? '' : 'vazio'}>{f || 'não informado'}{f && e.padrao && <span className="auto">automático</span>}</dd>
                      </div>
                    )
                  })}
                </dl>
              )}
              {repet.length > 0 && (
                rows.length === 0 ? (
                  <div className="vazio-estado">Nenhuma linha cadastrada em {bloco}.</div>
                ) : (
                  <div className="tabela-wrap">
                    <table className="tab">
                      <thead><tr><th>#</th>{repet.map((c) => <th key={c.id}>{c.parametro}</th>)}</tr></thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r._id}>
                            <td className="n">{i + 1}</td>
                            {repet.map((c) => {
                              const e = efetivo(proc, analise, c, r)
                              const num = ['moeda', 'numero', 'percentual', 'expressao', 'moeda-ou-sigiloso'].includes(tipoDe(c))
                              return <td key={c.id} className={num ? 'n' : ''}>{fmtValor(c, e.valor) ?? '—'}</td>
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </section>
        )
      })}
    </>
  )
}

function ResumoMargem({ a }) {
  const cls = classeSituacao[a.situacao]
  const textoSit = {
    Viável: `margem de ${fmtPct(a.margem, 1)}, acima do mínimo de ${fmtPct(a.margemMin, 1)}`,
    Atenção: `margem de ${fmtPct(a.margem, 1)}, abaixo do mínimo de ${fmtPct(a.margemMin, 1)}`,
    Inviável: `margem negativa (${fmtPct(a.margem, 1)}): prejuízo`,
    'Sem dados': 'preencha os itens com valor proposto e valor a pagar',
  }[a.situacao]
  return (
    <>
      <div className={'situacao ' + cls}>
        <span>{a.situacao.toUpperCase()}</span>
        <small>{textoSit}</small>
      </div>
      <div className="kpis">
        <div className="kpi destaque"><span>Faturamento mensal</span><b>{fmtMoeda(a.fat)}</b><small>Estimado do edital: {fmtMoeda(a.estimadoMensal)}</small></div>
        <div className="kpi"><span>Valor global</span><b>{fmtMoeda(a.valorGlobal)}</b><small>{a.vigencia} meses de vigência</small></div>
        <div className="kpi"><span>Resultado mensal</span><b>{fmtMoeda(a.resultado)}</b><small>Na vigência: {fmtMoeda(a.resultado * a.vigencia)}</small></div>
        <div className="kpi"><span>Margem</span><b>{fmtPct(a.margem)}</b><small>Mínimo: {fmtPct(a.margemMin, 1)}</small></div>
      </div>

      <section className="painel">
        <div className="painel-cab"><h2>Composição por item</h2><small>Carga tributária {fmtPct(a.carga)} · ISS aplicado {fmtPct(a.iss)}</small></div>
        <div className="tabela-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="tab">
            <thead>
              <tr><th>#</th><th>Descrição</th><th className="n">Qtd/mês</th><th className="n">Proposto</th><th className="n">A pagar</th><th className="n">Faturamento</th><th className="n">Tributos</th><th className="n">Resultado</th><th className="n">Margem</th><th className="n">Preço mín.</th><th>Status</th></tr>
            </thead>
            <tbody>
              {a.itens.map((it) => (
                <tr key={it._id}>
                  <td className="n">{it.n}</td><td>{it.descricao || '—'}</td>
                  <td className="n">{fmtNum(it.qtd)}</td><td className="n">{fmtMoeda(it.proposto)}</td><td className="n">{fmtMoeda(it.pagar)}</td>
                  <td className="n">{fmtMoeda(it.fat)}</td><td className="n">{fmtMoeda(it.trib)}</td><td className="n">{fmtMoeda(it.resultado)}</td>
                  <td className="n">{fmtPct(it.margem)}</td><td className="n">{fmtMoeda(it.precoMin)}</td>
                  <td><span className={'pill ' + classeStatus(it.status)}>{it.status}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td></td><td>Total mensal</td><td className="n">{fmtNum(a.itens.reduce((s, i) => s + i.qtd, 0))}</td><td></td><td></td>
                <td className="n">{fmtMoeda(a.fat)}</td><td className="n">{fmtMoeda(a.trib)}</td><td className="n">{fmtMoeda(a.fat - a.custo - a.trib)}</td><td></td><td></td><td></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        <section className="painel">
          <div className="painel-cab"><h2>Resultado consolidado</h2><small>mensal · global</small></div>
          <div className="painel-corpo" style={{ gap: 8 }}>
            <div className="par"><span>Faturamento</span><b>{fmtMoeda(a.fat)} · {fmtMoeda(a.fat * a.vigencia)}</b></div>
            <div className="par"><span>(−) Tributos</span><b>{fmtMoeda(a.trib)} · {fmtMoeda(a.trib * a.vigencia)}</b></div>
            <div className="par"><span>(−) Custo dos médicos</span><b>{fmtMoeda(a.custo)} · {fmtMoeda(a.custo * a.vigencia)}</b></div>
            <div className="par"><span>(−) Custos indiretos</span><b>{fmtMoeda(a.indiretos)} · {fmtMoeda(a.indiretos * a.vigencia)}</b></div>
            <div className="par" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}><span>(=) Resultado</span><b>{fmtMoeda(a.resultado)} · {fmtMoeda(a.resultado * a.vigencia)}</b></div>
          </div>
        </section>
        <section className="painel">
          <div className="painel-cab"><h2>Limites para a disputa</h2><small>global (vigência)</small></div>
          <div className="painel-corpo" style={{ gap: 8 }}>
            <div className="par"><span>Valor estimado do edital</span><b>{fmtMoeda(a.estimadoGlobal || null)}</b></div>
            <div className="par"><span>Nosso preço</span><b>{fmtMoeda(a.valorGlobal)}</b></div>
            <div className="par"><span>Lance limite (margem mínima)</span><b>{fmtMoeda(a.lanceLimiteGlobal)}</b></div>
            <div className="par"><span>Ponto de equilíbrio (margem zero)</span><b>{fmtMoeda(a.equilibrioGlobal)}</b></div>
            <div className="par"><span>Desconto máximo s/ estimado</span><b>{fmtPct(a.descontoMaximo)}</b></div>
          </div>
        </section>
      </div>
    </>
  )
}

function AgendaGeral({ processos, atualId, selecionar }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const lista = processos
    .map((p) => ({ p, data: valor(p, CAMPO.data) || '', hora: valor(p, CAMPO.hora) || '', iss: valor(p, CAMPO.statusIss) || '' }))
    .sort((x, y) => (x.data || '9999').localeCompare(y.data || '9999') || x.hora.localeCompare(y.hora))
  return (
    <section className="painel">
      <div className="painel-cab"><h2>Sessões de todos os processos</h2><small>ordenadas por data</small></div>
      <div className="tabela-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table className="tab">
          <thead><tr><th>Data</th><th>Hora</th><th>Processo</th><th>Modalidade</th><th>Consulta ISS</th><th></th></tr></thead>
          <tbody>
            {lista.map(({ p, data, hora, iss }) => (
              <tr key={p.id} className="clicavel" onClick={() => selecionar(p.id)} style={p.id === atualId ? { boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}>
                <td className="n">{fmtData(data)}</td><td className="n">{hora || '—'}</td>
                <td>{rotuloProcesso(p)}</td><td>{valor(p, CAMPO.modalidade) || '—'}</td>
                <td>{iss ? <span className={'pill ' + (iss === 'Confirmado' ? 'ok' : 'warn')}>{iss}</span> : '—'}</td>
                <td>{data && data < hoje ? <span className="pill neutro">Encerrada</span> : data ? <span className="pill ok">Próxima</span> : <span className="pill warn">Sem data</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ClientesCadastrados({ processos, clientes, atual, irPara }) {
  const lista = [...clientes].sort((x, y) => ufCliente(x).localeCompare(ufCliente(y)) || nomeCliente(x).localeCompare(nomeCliente(y), 'pt-BR'))
  return (
    <section className="painel">
      <div className="painel-cab"><h2>Clientes cadastrados</h2><button type="button" className="link" onClick={() => irPara('clientes')}>Gerenciar clientes</button></div>
      {lista.length === 0 ? (
        <div className="vazio-estado">Nenhum cliente cadastrado.</div>
      ) : (
        <div className="tabela-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="tab">
            <thead><tr><th>Cliente</th><th>UF</th><th>Município</th><th className="n">Viabilidades</th><th className="n">Valor global</th></tr></thead>
            <tbody>
              {lista.map((c) => {
                const procs = processos.filter((p) => p.clienteId === c.id)
                const global = procs.reduce((s, p) => s + analisar(p).valorGlobal, 0)
                return (
                  <tr key={c.id} style={atual?.clienteId === c.id ? { boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}>
                    <td>{nomeCliente(c)}</td><td>{ufCliente(c) || '—'}</td><td>{cidadeCliente(c) || '—'}</td>
                    <td className="n">{procs.length}</td><td className="n">{fmtMoeda(global)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
