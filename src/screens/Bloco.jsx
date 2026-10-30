import { useState } from 'react'
import Campo from '../components/Campo.jsx'
import { NOMES_DESTINO, camposDoBloco } from '../config/regras.js'
import { CAMPO } from '../lib/calculos.js'
import { fmtMoeda, fmtNum, fmtPct } from '../lib/formato.js'
import { situacaoBloco } from '../lib/validacao.js'
import { novoId } from '../lib/armazenamento.js'
import { CAMPOS_DO_CLIENTE, CAMPOS_DO_CLIENTE_IDS, municipioCliente, nomeCliente } from '../lib/clientes.js'
import { RelatorioImportacao, SeletorModelo } from '../components/Importacao.jsx'
import { BLOCOS_IMPORTADOS } from '../lib/importarExcel.js'

const agrupar = (lista, chave) => {
  const m = new Map()
  for (const x of lista) {
    const k = chave(x)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(x)
  }
  return [...m]
}

function BotaoExcluir({ onConfirmar, rotulo = 'Remover' }) {
  const [conf, setConf] = useState(false)
  return conf ? (
    <span className="acoes">
      <button type="button" className="btn peq perigo conf" onClick={onConfirmar}>Confirmar</button>
      <button type="button" className="btn peq" onClick={() => setConf(false)}>Cancelar</button>
    </span>
  ) : (
    <button type="button" className="btn peq perigo" onClick={() => setConf(true)}>{rotulo}</button>
  )
}

export default function Bloco({ bloco, proc, analise, alterarValor, alterarGrupo, irPara, clientes, trocarCliente, editarCliente, reimportar }) {
  const campos = camposDoBloco(bloco)
  const camposForm = campos.filter((c) => !CAMPOS_DO_CLIENTE_IDS.includes(c.id))
  const [importacao, setImportacao] = useState(null)
  const sit = situacaoBloco(proc, analise, bloco)
  const destinos = [...new Set(campos.flatMap((c) => c.destinos))]
  const secoes = agrupar(camposForm, (c) => c.secao)
  const pct = sit.total ? Math.round((sit.ok / sit.total) * 100) : 100

  return (
    <>
      <header className="cab">
        <div className="cab-txt">
          <span className="eyebrow">Cadastro · aba {bloco} do modelo</span>
          <h1>{bloco}</h1>
          <p>
            Alimenta automaticamente:{' '}
            {destinos.map((d, i) => (
              <span key={d}>{i > 0 && ', '}<button type="button" className="link" onClick={() => irPara(d === 'agenda' ? 'agenda' : 'tela-' + d)}>{NOMES_DESTINO[d] || d}</button></span>
            ))}
            . Campos com <span className="req">*</span> são obrigatórios.
          </p>
        </div>
        <div className="progresso" aria-label="Preenchimento dos obrigatórios">
          <span className="barra"><i style={{ width: pct + '%' }} /></span>
          <span className="num">{sit.ok}/{sit.total}</span>
          {sit.erros > 0 && <span className="pill bad">{sit.erros} com erro</span>}
        </div>
      </header>

      {bloco === 'Processo' && (
        <ClienteVinculado proc={proc} clientes={clientes} trocarCliente={trocarCliente} editarCliente={editarCliente} />
      )}

      {BLOCOS_IMPORTADOS.includes(bloco) && (
        <ImportarNoProcesso importacao={importacao} setImportacao={setImportacao} reimportar={reimportar} />
      )}

      {sit.pend.length > 0 && (
        <div className="aviso">
          <b>Faltam {sit.pend.length} obrigatório{sit.pend.length > 1 ? 's' : ''}:</b> {sit.pend.slice(0, 6).join(' · ')}{sit.pend.length > 6 ? ` e mais ${sit.pend.length - 6}` : ''}
        </div>
      )}

      {secoes.map(([secao, cs]) => {
        const grupo = cs[0].grupo
        return grupo ? (
          <Grupo key={secao} secao={secao} grupo={grupo} campos={cs} bloco={bloco} proc={proc} analise={analise} alterarGrupo={alterarGrupo} />
        ) : (
          <section key={secao} className="painel">
            <div className="painel-cab"><h2>{secao}</h2><small>{cs.length} campo{cs.length > 1 ? 's' : ''}</small></div>
            <div className="painel-corpo">
              <div className="grade">
                {cs.map((c) => (
                  <Campo key={c.id} id={'f-' + c.id} campo={c}
                    valor={proc.valores?.[c.id]} padrao={analise.padroes[c.id]}
                    onChange={(v) => alterarValor(c.id, v)} />
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}

function Grupo({ secao, grupo, campos, bloco, proc, analise, alterarGrupo }) {
  const rows = proc.grupos?.[grupo] || []
  const ehItem = !!CAMPO.mgDesc && grupo === CAMPO.mgDesc.grupo
  const nomeLinha = ehItem ? 'Item' : 'Posição'
  const atualizar = (idx, campoId, v) => {
    const novo = rows.map((r, i) => (i === idx ? { ...r, [campoId]: v } : r))
    alterarGrupo(grupo, novo)
  }
  const titulo = (r) => {
    if (ehItem) return r[CAMPO.mgDesc?.id] || r[CAMPO.trProf?.id] || 'Novo item'
    return r[CAMPO.ccRazao?.id] || 'Novo concorrente'
  }
  return (
    <section className="painel">
      <div className="painel-cab">
        <h2>{secao}</h2>
        <small>{ehItem ? 'Os itens são os mesmos nas abas TR e Margem' : 'Uma linha por licitante, na ordem do ranking'}</small>
      </div>
      <div className="painel-corpo">
        {rows.length === 0 && (
          <div className="vazio-estado">
            <span>Nenhum{ehItem ? ' item cadastrado' : ' concorrente registrado'} ainda.</span>
          </div>
        )}
        <div className="linhas">
          {rows.map((r, idx) => {
            const calc = ehItem ? analise.itens.find((i) => i._id === r._id) : null
            return (
              <article key={r._id} className="linha">
                <div className="linha-cab">
                  <span className="n">{nomeLinha} {idx + 1}</span>
                  <b title={titulo(r)}>{titulo(r)}</b>
                  <BotaoExcluir onConfirmar={() => alterarGrupo(grupo, rows.filter((_, i) => i !== idx))} />
                </div>
                <div className="linha-corpo grade">
                  {campos.map((c) => (
                    <Campo key={c.id} id={`f-${c.id}-${r._id}`} campo={c} valor={r[c.id]}
                      padrao={analise.padroes[`${c.id}#${r._id}`]}
                      onChange={(v) => atualizar(idx, c.id, v)} />
                  ))}
                </div>
                {calc && bloco === 'TR' && (
                  <div className="linha-rodape">
                    <span>Horas/mês <b>{fmtNum(calc.horasMes)}</b></span>
                    {calc.mensalCalcTR !== null && <span>Mensal calculado <b>{fmtMoeda(calc.mensalCalcTR)}</b></span>}
                    {calc.mensalTR !== null && calc.mensalCalcTR !== null && (
                      <span className={Math.abs(calc.mensalCalcTR - calc.mensalTR) < 1 ? 'pill ok' : 'pill warn'}>
                        {Math.abs(calc.mensalCalcTR - calc.mensalTR) < 1 ? 'Confere com o TR' : 'Diferença ' + fmtMoeda(calc.mensalCalcTR - calc.mensalTR)}
                      </span>
                    )}
                  </div>
                )}
                {calc && bloco === 'Margem' && (
                  <div className="linha-rodape">
                    <span>Faturamento <b>{fmtMoeda(calc.fat)}</b></span>
                    <span>Custo <b>{fmtMoeda(calc.custo)}</b></span>
                    <span>Margem <b>{fmtPct(calc.margem)}</b></span>
                    <span className={'pill ' + (calc.status === 'Acima do mínimo' ? 'ok' : calc.status === 'Prejuízo' ? 'bad' : calc.status === 'Abaixo do mínimo' ? 'warn' : 'neutro')}>{calc.status}</span>
                  </div>
                )}
              </article>
            )
          })}
        </div>
        <div>
          <button type="button" className="btn" onClick={() => alterarGrupo(grupo, [...rows, { _id: novoId() }])}>
            + Adicionar {ehItem ? 'item' : 'concorrente'}
          </button>
        </div>
      </div>
    </section>
  )
}

function ClienteVinculado({ proc, clientes, trocarCliente, editarCliente }) {
  const [trocando, setTrocando] = useState(false)
  const cli = clientes.find((c) => c.id === proc.clienteId)
  return (
    <section className="painel">
      <div className="painel-cab">
        <h2>Cliente</h2>
        <span className="acoes">
          {cli && <button type="button" className="btn peq" onClick={() => editarCliente(cli.id)}>Editar cliente</button>}
          <button type="button" className="btn peq" onClick={() => setTrocando((x) => !x)}>{cli ? 'Trocar cliente' : 'Atribuir cliente'}</button>
        </span>
      </div>
      <div className="painel-corpo">
        {cli ? (
          <dl className="dl">
            <div><dt>Nome do cliente / órgão</dt><dd>{nomeCliente(cli)}</dd></div>
            {CAMPOS_DO_CLIENTE.map((c) => {
              const v = cli.valores?.[c.id]
              return (
                <div key={c.id}>
                  <dt>{c.parametro} <span className="origem mono">· {c.bloco}!{c.celula}</span></dt>
                  <dd className={v === undefined || v === '' ? 'vazio' : ''}>{v === undefined || v === '' ? 'não informado' : typeof v === 'number' ? fmtNum(v) : v}</dd>
                </div>
              )
            })}
          </dl>
        ) : (
          <div className="aviso">Esta viabilidade ainda não tem cliente. Município/UF e capital vêm do cadastro do cliente.</div>
        )}
        {trocando && (
          <div className="campo" style={{ maxWidth: 480 }}>
            <label htmlFor="trocar-cliente">Escolha o cliente</label>
            <select id="trocar-cliente" value={proc.clienteId || ''} onChange={(e) => { if (e.target.value) { trocarCliente(e.target.value); setTrocando(false) } }}>
              <option value="">Selecione…</option>
              {[...clientes].sort((a, b) => nomeCliente(a).localeCompare(nomeCliente(b), 'pt-BR')).map((c) => (
                <option key={c.id} value={c.id}>{nomeCliente(c)} — {municipioCliente(c) || 'sem município'}</option>
              ))}
            </select>
            <span className="ajuda">Para um cliente novo, cadastre-o em Clientes e volte aqui.</span>
          </div>
        )}
      </div>
    </section>
  )
}

function ImportarNoProcesso({ importacao, setImportacao, reimportar }) {
  const [aberto, setAberto] = useState(false)
  if (importacao) {
    return (
      <section className="painel">
        <div className="painel-cab"><h2>Importação do modelo</h2><button type="button" className="link" onClick={() => setImportacao(null)}>Fechar</button></div>
        <div className="painel-corpo"><RelatorioImportacao rel={importacao.relatorio} arquivo={importacao.arquivo} /></div>
      </section>
    )
  }
  return aberto ? (
    <section className="painel">
      <div className="painel-cab"><h2>Importar modelo de viabilidade preenchido</h2><button type="button" className="link" onClick={() => setAberto(false)}>Cancelar</button></div>
      <div className="painel-corpo">
        <div className="aviso">A importação substitui os dados de Processo, TR, Premissas e Margem desta viabilidade. Cliente e concorrentes são mantidos.</div>
        <SeletorModelo id="reimportar-arquivo" onImportar={async (buf, nome) => { const relatorio = await reimportar(buf); setImportacao({ relatorio, arquivo: nome }); setAberto(false) }} />
      </div>
    </section>
  ) : (
    <div><button type="button" className="btn" onClick={() => setAberto(true)}>Importar modelo de viabilidade (.xlsx)</button></div>
  )
}
