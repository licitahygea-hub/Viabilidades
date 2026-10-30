import { useEffect, useRef, useState } from 'react'
import { municipioCliente, nomeCliente } from '../lib/clientes.js'
import { RelatorioImportacao, SeletorModelo } from '../components/Importacao.jsx'

// Janela de nova viabilidade: 1) cliente  2) modelo preenchido ou em branco  3) resultado da importação
export default function NovaViabilidade({ estado, clientes, fechar, escolherCliente, cadastrarCliente, criarEmBranco, criarImportando, abrir }) {
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(estado.clienteId || '')
  const caixa = useRef(null)
  useEffect(() => { caixa.current?.focus() }, [estado.etapa])
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [fechar])

  const cliente = clientes.find((c) => c.id === estado.clienteId)
  const q = busca.trim().toLowerCase()
  const lista = clientes
    .filter((c) => !q || `${nomeCliente(c)} ${municipioCliente(c)}`.toLowerCase().includes(q))
    .sort((a, b) => nomeCliente(a).localeCompare(nomeCliente(b), 'pt-BR'))

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="nv-titulo" tabIndex={-1} ref={caixa}>
        <div className="modal-cab">
          <div className="cab-txt">
            <span className="eyebrow">Nova viabilidade · {estado.etapa === 'cliente' ? 'passo 1 de 2' : estado.etapa === 'inicio' ? 'passo 2 de 2' : 'concluído'}</span>
            <h2 id="nv-titulo">
              {estado.etapa === 'cliente' && 'A qual cliente pertence esta viabilidade?'}
              {estado.etapa === 'inicio' && 'Como deseja preencher?'}
              {estado.etapa === 'resultado' && 'Viabilidade criada'}
            </h2>
          </div>
          <button type="button" className="btn peq" onClick={fechar} aria-label="Fechar">Fechar</button>
        </div>

        {estado.etapa === 'cliente' && (
          <div className="modal-corpo">
            <div className="campo">
              <label htmlFor="nv-busca">Buscar no cadastro</label>
              <input id="nv-busca" className="ctrl" value={busca} placeholder="Nome do órgão ou município" onChange={(e) => setBusca(e.target.value)} autoFocus />
            </div>
            <div className="lista-escolha" role="radiogroup" aria-label="Clientes cadastrados">
              {lista.map((c) => (
                <label key={c.id} className={'escolha' + (sel === c.id ? ' marcada' : '')}>
                  <input type="radio" name="nv-cliente" value={c.id} checked={sel === c.id} onChange={() => setSel(c.id)} />
                  <span><b>{nomeCliente(c)}</b><small>{municipioCliente(c) || 'Sem município'}</small></span>
                </label>
              ))}
              {lista.length === 0 && <div className="vazio-estado">Nenhum cliente encontrado com “{busca}”.</div>}
            </div>
            <div className="modal-rodape">
              <button type="button" className="btn" onClick={cadastrarCliente}>+ Cadastrar novo cliente</button>
              <button type="button" className="btn pri" disabled={!sel} onClick={() => escolherCliente(sel)}>Continuar</button>
            </div>
          </div>
        )}

        {estado.etapa === 'inicio' && cliente && (
          <div className="modal-corpo">
            <div className="cliente-tag"><span>Cliente</span><b>{nomeCliente(cliente)}</b><small>{municipioCliente(cliente)}</small></div>
            <div className="opcoes-inicio">
              <section className="opcao">
                <h3>Importar o modelo de viabilidade preenchido</h3>
                <p>Lê as abas Processo, TR, Premissas e Margem do Excel (com os dados do edital e anexos) e preenche os mesmos campos aqui, célula por célula, conforme a coluna E da planilha de parâmetros.</p>
                <SeletorModelo onImportar={(buf, nome) => criarImportando(buf, nome)} id="nv-arquivo" />
              </section>
              <section className="opcao">
                <h3>Começar em branco</h3>
                <p>Cria a viabilidade com as premissas da empresa já preenchidas. Os demais campos são digitados nas telas de cadastro.</p>
                <div><button type="button" className="btn" onClick={criarEmBranco}>Começar em branco</button></div>
              </section>
            </div>
            <div className="modal-rodape">
              <button type="button" className="btn" onClick={() => escolherCliente(null)}>Trocar cliente</button>
            </div>
          </div>
        )}

        {estado.etapa === 'resultado' && (
          <div className="modal-corpo">
            {cliente && <div className="cliente-tag"><span>Cliente</span><b>{nomeCliente(cliente)}</b><small>{municipioCliente(cliente)}</small></div>}
            {estado.relatorio ? <RelatorioImportacao rel={estado.relatorio} arquivo={estado.arquivo} /> : <p>Viabilidade criada em branco.</p>}
            <div className="modal-rodape">
              <button type="button" className="btn pri" onClick={abrir}>Abrir viabilidade</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
