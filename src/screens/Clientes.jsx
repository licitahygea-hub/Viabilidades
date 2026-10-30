import { useState } from 'react'
import Campo from '../components/Campo.jsx'
import { CAMPOS_CADASTRO_CLIENTE, CAMPO_CNPJ, errosCliente, municipioCliente, nomeCliente, padroesCliente } from '../lib/clientes.js'
import { fmtData } from '../lib/formato.js'
import { valor, CAMPO } from '../lib/calculos.js'

export function ListaClientes({ clientes, processos, novoCliente, editar, excluir, novaViabilidade }) {
  const [busca, setBusca] = useState('')
  const [confirmar, setConfirmar] = useState(null)
  const q = busca.trim().toLowerCase()
  const lista = clientes
    .filter((c) => !q || `${nomeCliente(c)} ${municipioCliente(c)}`.toLowerCase().includes(q))
    .sort((a, b) => nomeCliente(a).localeCompare(nomeCliente(b), 'pt-BR'))
  return (
    <>
      <header className="cab">
        <div className="cab-txt">
          <span className="eyebrow">Cadastro</span>
          <h1>Clientes</h1>
          <p>Órgãos contratantes. Município, UF e capital de cada viabilidade vêm daqui e alimentam os filtros do dashboard.</p>
        </div>
        <div className="acoes"><button type="button" className="btn pri" onClick={novoCliente}>+ Novo cliente</button></div>
      </header>
      <div className="campo" style={{ maxWidth: 420 }}>
        <label htmlFor="busca-cliente">Buscar cliente</label>
        <input id="busca-cliente" className="ctrl" value={busca} placeholder="Nome ou município" onChange={(e) => setBusca(e.target.value)} />
      </div>
      {lista.length === 0 ? (
        <div className="painel vazio-estado">
          <span>{clientes.length ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado ainda.'}</span>
          <button type="button" className="btn pri" onClick={novoCliente}>Cadastrar cliente</button>
        </div>
      ) : (
        <div className="cartoes">
          {lista.map((c) => {
            const procs = processos.filter((p) => p.clienteId === c.id)
            const ultima = procs.map((p) => valor(p, CAMPO.data)).filter(Boolean).sort().pop()
            return (
              <article key={c.id} className="cartao">
                <div className="linha-info">
                  <span>{municipioCliente(c) || 'Sem município'}</span>
                  {c.valores?.[CAMPO_CNPJ.id] && <span className="num">{c.valores[CAMPO_CNPJ.id]}</span>}
                </div>
                <h3>{nomeCliente(c)}</h3>
                <div className="par"><span>Viabilidades</span><b>{procs.length}</b></div>
                <div className="par"><span>Última abertura</span><b>{fmtData(ultima)}</b></div>
                <div className="acoes">
                  <button type="button" className="btn peq pri" onClick={() => novaViabilidade(c.id)}>Nova viabilidade</button>
                  <button type="button" className="btn peq" onClick={() => editar(c.id)}>Editar</button>
                  {procs.length === 0 && (confirmar === c.id ? (
                    <>
                      <button type="button" className="btn peq perigo conf" onClick={() => { excluir(c.id); setConfirmar(null) }}>Excluir de vez</button>
                      <button type="button" className="btn peq" onClick={() => setConfirmar(null)}>Cancelar</button>
                    </>
                  ) : (
                    <button type="button" className="btn peq perigo" onClick={() => setConfirmar(c.id)}>Excluir</button>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

export function FormCliente({ cliente, continuarViabilidade, salvar, cancelar, duplicadoDe }) {
  const [valores, setValores] = useState(cliente?.valores || {})
  const [tentou, setTentou] = useState(false)
  const erros = errosCliente(valores)
  const pad = padroesCliente(valores)
  const duplicado = duplicadoDe(valores, cliente?.id)
  const enviar = (e) => {
    e.preventDefault()
    setTentou(true)
    if (Object.keys(erros).length === 0 && !duplicado) salvar(valores)
  }
  return (
    <form onSubmit={enviar} noValidate style={{ display: 'grid', gap: 22 }}>
      <header className="cab">
        <div className="cab-txt">
          <span className="eyebrow">{continuarViabilidade ? 'Nova viabilidade · passo 1 de 2' : 'Cadastro de cliente'}</span>
          <h1>{cliente ? 'Editar cliente' : 'Cadastrar cliente'}</h1>
          <p>{continuarViabilidade ? 'Cadastre o órgão contratante. Ao salvar, a nova viabilidade será criada para este cliente.' : 'As alterações são aplicadas a todas as viabilidades deste cliente.'}</p>
        </div>
      </header>
      {tentou && (Object.keys(erros).length > 0 || duplicado) && (
        <div className="aviso">
          {duplicado ? `Já existe um cliente com este nome e município: ${nomeCliente(duplicado)}.` : 'Confira os campos destacados antes de salvar.'}
        </div>
      )}
      <section className="painel">
        <div className="painel-cab"><h2>Dados do cliente</h2><small>Campos com <span className="req">*</span> são obrigatórios</small></div>
        <div className="painel-corpo">
          <div className="grade">
            {CAMPOS_CADASTRO_CLIENTE.map((c) => (
              <div key={c.id} className={tentou && erros[c.id] ? 'campo-forcar-erro' : ''}>
                <Campo id={'cli-' + c.id} campo={c} valor={valores[c.id]} padrao={pad[c.id]}
                  onChange={(v) => setValores((x) => ({ ...x, [c.id]: v }))} />
                {tentou && erros[c.id] === 'Campo obrigatório.' && <span className="msg-erro">Campo obrigatório.</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="acoes">
        <button type="submit" className="btn pri">{continuarViabilidade ? 'Salvar e continuar' : 'Salvar cliente'}</button>
        <button type="button" className="btn" onClick={cancelar}>Cancelar</button>
      </div>
    </form>
  )
}
