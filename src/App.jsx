import { useCallback, useEffect, useMemo, useState } from 'react'
import { BLOCOS, CAMPOS, DESTINOS, NOMES_DESTINO, ORIGEM_CONFIG } from './config/regras.js'
import { analisar, grupoConcorrentes, grupoItens, rotuloProcesso } from './lib/calculos.js'
import { slug } from './lib/formato.js'
import { situacaoBloco } from './lib/validacao.js'
import { carregar, migrar, novoId, novoProcesso, salvar } from './lib/armazenamento.js'
import { CAMPOS_DO_CLIENTE_IDS, aplicarCliente, cidadeCliente, finalizarCliente, ufCliente } from './lib/clientes.js'
import { BLOCOS_IMPORTADOS, importarViabilidade } from './lib/importarExcel.js'
import Bloco from './screens/Bloco.jsx'
import TelaDestino from './screens/TelaDestino.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Processos from './screens/Processos.jsx'
import { FormCliente, ListaClientes } from './screens/Clientes.jsx'
import NovaViabilidade from './screens/NovaViabilidade.jsx'

// Rotas por hash: #dashboard · #processos · #clientes · #cliente-cadastro · #bloco-processo · #tela-margem · #agenda
const rotaDeBloco = (b) => 'bloco-' + slug(b)
const rotaDeDestino = (d) => (d === 'agenda' ? 'agenda' : 'tela-' + d)
const lerRota = () => (typeof location !== 'undefined' ? location.hash.replace('#', '') : '') || 'dashboard'
const agora = () => new Date().toISOString()

function ItemMenu({ r, rota, irPara, children, extra }) {
  return (
    <button type="button" className="nav-item" aria-current={rota === r ? 'page' : undefined} onClick={() => irPara(r)}>
      <span className="rot">{children}</span>{extra}
    </button>
  )
}

export default function App() {
  const [dados, setDados] = useState(carregar)
  const [rota, setRota] = useState(lerRota)
  const [menuAberto, setMenuAberto] = useState(false)
  const [filtros, setFiltros] = useState({ uf: '', municipio: '' })
  const [salvoOk, setSalvoOk] = useState(true)
  const [modal, setModal] = useState(null) // { etapa: 'cliente'|'inicio'|'resultado', clienteId, processoId, relatorio, arquivo }
  const [formCliente, setFormCliente] = useState({ id: null, continuar: false, voltar: 'clientes' })

  const processos = dados.processos
  const clientes = dados.clientes || []
  const atual = processos.find((p) => p.id === dados.atualId) || processos[0]
  const analise = useMemo(() => (atual ? analisar(atual) : null), [atual])

  useEffect(() => { setSalvoOk(salvar(dados)) }, [dados])
  useEffect(() => {
    const f = () => { setRota(lerRota()); setMenuAberto(false) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  useEffect(() => { window.scrollTo?.(0, 0) }, [rota, dados.atualId])

  const irPara = (r) => {
    const final = r.startsWith('bloco-') ? 'bloco-' + slug(r.slice(6)) : r
    if (location.hash !== '#' + final) location.hash = final
    setRota(final)
    setMenuAberto(false)
  }

  // ---------- processo atual ----------
  const mudarAtual = (fn) =>
    setDados((d) => ({
      ...d,
      processos: d.processos.map((p) => (p.id === (d.atualId || d.processos[0]?.id) ? { ...fn(p), atualizadoEm: agora() } : p)),
    }))
  const alterarValor = (campoId, v) => mudarAtual((p) => ({ ...p, valores: { ...p.valores, [campoId]: v } }))
  const alterarGrupo = (grupo, rows) => mudarAtual((p) => ({ ...p, grupos: { ...p.grupos, [grupo]: rows } }))
  const selecionar = (id, r) => { setDados((d) => ({ ...d, atualId: id })); if (r) irPara(r) }

  const adicionarProcesso = (p) => setDados((d) => ({ ...d, processos: [p, ...d.processos], atualId: p.id }))

  const duplicar = (id) => {
    const copia = JSON.parse(JSON.stringify(processos.find((p) => p.id === id)))
    Object.assign(copia, { id: novoId(), exemplo: false, criadoEm: agora() })
    for (const g of Object.keys(copia.grupos || {})) copia.grupos[g] = copia.grupos[g].map((r) => ({ ...r, _id: novoId() }))
    adicionarProcesso(copia)
  }
  const excluir = (id) =>
    setDados((d) => {
      const resto = d.processos.filter((p) => p.id !== id)
      const removido = d.processos.find((p) => p.id === id)
      const cli = (d.clientes || []).find((c) => c.id === removido?.clienteId)
      const lista = resto.length ? resto : [cli ? aplicarCliente(novoProcesso(removido), cli) : novoProcesso(removido)]
      return { ...d, processos: lista, atualId: d.atualId === id ? lista[0].id : d.atualId }
    })
  const importarBackup = (lista) =>
    setDados((d) => {
      const ids = new Set(lista.map((p) => p.id))
      return migrar({ ...d, processos: [...lista, ...d.processos.filter((p) => !ids.has(p.id))], atualId: lista[0]?.id || d.atualId })
    })

  // Reimportar o modelo preenchido no processo atual: troca Processo, TR, Premissas e Margem
  const reimportar = async (buf) => {
    const cli = clientes.find((c) => c.id === atual?.clienteId)
    const res = await importarViabilidade(buf, cli)
    const blocoDe = Object.fromEntries(CAMPOS.map((c) => [c.id, c.bloco]))
    mudarAtual((p) => {
      const mantidos = Object.fromEntries(Object.entries(p.valores).filter(([k]) => !BLOCOS_IMPORTADOS.includes(blocoDe[k]) || CAMPOS_DO_CLIENTE_IDS.includes(k)))
      return { ...p, exemplo: false, valores: { ...mantidos, ...res.valores }, grupos: { ...p.grupos, [grupoItens]: res.grupos[grupoItens] } }
    })
    return res.relatorio
  }

  // ---------- clientes ----------
  const abrirFormCliente = (id, continuar = false) => {
    setFormCliente({ id, continuar, voltar: rota === 'cliente-cadastro' ? 'clientes' : rota })
    irPara('cliente-cadastro')
  }
  const salvarCliente = (valoresBrutos) => {
    const valores = finalizarCliente(valoresBrutos)
    const id = formCliente.id || novoId()
    setDados((d) => {
      const lista = d.clientes || []
      const existe = lista.some((c) => c.id === id)
      const cliente = existe ? { ...lista.find((c) => c.id === id), valores, atualizadoEm: agora() } : { id, criadoEm: agora(), valores }
      return {
        ...d,
        clientes: existe ? lista.map((c) => (c.id === id ? cliente : c)) : [...lista, cliente],
        processos: d.processos.map((p) => (p.clienteId === id ? aplicarCliente(p, cliente) : p)),
      }
    })
    if (formCliente.continuar) {
      irPara('clientes')
      setModal({ etapa: 'inicio', clienteId: id })
    } else irPara(formCliente.voltar || 'clientes')
  }
  const excluirCliente = (id) => setDados((d) => ({ ...d, clientes: (d.clientes || []).filter((c) => c.id !== id) }))
  const duplicadoDe = (valores, ignorarId) => {
    const v = finalizarCliente(valores)
    const chave = (x) => `${slug(x.valores?.['cliente__nome'])}|${cidadeCliente(x)}|${ufCliente(x)}`
    const alvo = chave({ valores: v })
    return clientes.find((c) => c.id !== ignorarId && chave(c) === alvo && slug(v['cliente__nome'])) || null
  }
  const trocarCliente = (id) => {
    const cli = clientes.find((c) => c.id === id)
    if (cli) mudarAtual((p) => aplicarCliente(p, cli))
  }

  // ---------- nova viabilidade ----------
  const novaViabilidade = (clienteId) => {
    if (clienteId) setModal({ etapa: 'inicio', clienteId })
    else if (clientes.length === 0) abrirFormCliente(null, true)
    else setModal({ etapa: 'cliente' })
  }
  const fecharModal = useCallback(() => setModal(null), [])
  const clienteDoModal = clientes.find((c) => c.id === modal?.clienteId)
  const criarEmBranco = () => {
    const p = aplicarCliente(novoProcesso(atual), clienteDoModal)
    p.grupos = { [grupoItens]: [], [grupoConcorrentes]: [] }
    adicionarProcesso(p)
    setModal(null)
    irPara(rotaDeBloco(BLOCOS[0]))
  }
  const criarImportando = async (buf, nome) => {
    const res = await importarViabilidade(buf, clienteDoModal)
    const p = novoProcesso(atual)
    p.valores = { ...p.valores, ...res.valores }
    p.grupos = { [grupoItens]: res.grupos[grupoItens], [grupoConcorrentes]: [] }
    const final = aplicarCliente(p, clienteDoModal)
    adicionarProcesso(final)
    setModal({ etapa: 'resultado', clienteId: clienteDoModal.id, processoId: final.id, relatorio: res.relatorio, arquivo: nome })
  }

  // ---------- tela atual ----------
  let tela = null
  let titulo = 'Dashboard'
  const blocoDaRota = BLOCOS.find((b) => rotaDeBloco(b) === rota)
  const destinoDaRota = DESTINOS.find((d) => rotaDeDestino(d) === rota)
  if (rota === 'processos') {
    titulo = 'Processos'
    tela = <Processos processos={processos} atualId={atual?.id} selecionar={(id) => selecionar(id, rotaDeBloco(BLOCOS[0]))} criar={() => novaViabilidade()} duplicar={duplicar} excluir={excluir} importar={importarBackup} />
  } else if (rota === 'clientes') {
    titulo = 'Clientes'
    tela = <ListaClientes clientes={clientes} processos={processos} novoCliente={() => abrirFormCliente(null)} editar={(id) => abrirFormCliente(id)} excluir={excluirCliente} novaViabilidade={novaViabilidade} />
  } else if (rota === 'cliente-cadastro') {
    titulo = 'Cadastro de cliente'
    const cli = clientes.find((c) => c.id === formCliente.id) || null
    tela = <FormCliente key={formCliente.id || 'novo'} cliente={cli} continuarViabilidade={formCliente.continuar} salvar={salvarCliente} duplicadoDe={duplicadoDe}
      cancelar={() => { const voltar = formCliente.voltar; irPara(voltar === 'cliente-cadastro' ? 'clientes' : voltar || 'clientes'); if (formCliente.continuar && clientes.length) setModal({ etapa: 'cliente' }) }} />
  } else if (blocoDaRota && atual) {
    titulo = blocoDaRota
    tela = <Bloco key={atual.id + blocoDaRota} bloco={blocoDaRota} proc={atual} analise={analise} alterarValor={alterarValor} alterarGrupo={alterarGrupo} irPara={irPara}
      clientes={clientes} trocarCliente={trocarCliente} editarCliente={(id) => abrirFormCliente(id)} reimportar={reimportar} />
  } else if (destinoDaRota && atual) {
    titulo = destinoDaRota === 'agenda' ? 'Agenda' : 'Tela ' + (NOMES_DESTINO[destinoDaRota] || destinoDaRota)
    tela = <TelaDestino destino={destinoDaRota} proc={atual} analise={analise} processos={processos} clientes={clientes} irPara={irPara} selecionar={(id) => selecionar(id)} />
  } else {
    tela = <Dashboard processos={processos} clientes={clientes} filtros={filtros} setFiltros={setFiltros} abrir={(id) => selecionar(id, 'tela-margem')} />
  }

  const mostrarProcesso = atual && (blocoDaRota || destinoDaRota)

  return (
    <div className={'app' + (menuAberto ? ' aberto' : '')}>
      <aside className="side" aria-label="Menu">
        <div className="side-brand">
          <b>Viabilidade Licitações</b>
          <span>Modelo Margem Médicos · serviços médicos</span>
        </div>
        <div className="side-proc">
          <button type="button" className="btn pri" style={{ justifyContent: 'center' }} onClick={() => { setMenuAberto(false); novaViabilidade() }}>+ Nova viabilidade</button>
          <label htmlFor="sel-processo">Viabilidade em edição</label>
          <select id="sel-processo" value={atual?.id || ''} onChange={(e) => selecionar(e.target.value)}>
            {processos.map((p) => <option key={p.id} value={p.id}>{rotuloProcesso(p)}</option>)}
          </select>
        </div>
        <nav>
          <div className="nav-grupo">
            <ItemMenu rota={rota} irPara={irPara} r="dashboard">Dashboard</ItemMenu>
            <ItemMenu rota={rota} irPara={irPara} r="processos" extra={<span className="cnt">{processos.length}</span>}>Processos</ItemMenu>
            <ItemMenu rota={rota === 'cliente-cadastro' ? 'clientes' : rota} irPara={irPara} r="clientes" extra={<span className="cnt">{clientes.length}</span>}>Clientes</ItemMenu>
          </div>
          <div className="nav-grupo">
            <span className="nav-titulo">Cadastro (abas do modelo)</span>
            {BLOCOS.map((b) => {
              const s = atual ? situacaoBloco(atual, analise, b) : null
              const extra = s && <span className={'cnt ' + (s.erros ? 'err' : s.completo ? 'ok' : '')}>{s.erros ? `${s.erros} erro` : s.total ? `${s.ok}/${s.total}` : '—'}</span>
              return <ItemMenu rota={rota} irPara={irPara} key={b} r={rotaDeBloco(b)} extra={extra}>{b}</ItemMenu>
            })}
          </div>
          <div className="nav-grupo">
            <span className="nav-titulo">Telas alimentadas (de/para)</span>
            {DESTINOS.map((d) => (
              <ItemMenu rota={rota} irPara={irPara} key={d} r={rotaDeDestino(d)} extra={<span className="seta">←</span>}>{d === 'agenda' ? 'Agenda' : 'Tela ' + (NOMES_DESTINO[d] || d)}</ItemMenu>
            ))}
          </div>
        </nav>
        <div style={{ marginTop: 'auto', padding: '12px 20px 18px', fontSize: '0.72rem', color: 'var(--side-ink-2)' }}>
          Parâmetros: {ORIGEM_CONFIG}<br />
          {salvoOk ? 'Salvo neste navegador' : 'Não foi possível salvar neste navegador'}
        </div>
      </aside>
      <div className="veu" onClick={() => setMenuAberto(false)} />
      <div className="main">
        <div className="topo">
          <button type="button" className="btn-menu" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>☰ Menu</button>
          <b>{titulo}</b>
        </div>
        <main className="conteudo">
          {mostrarProcesso && (
            <div className="salvo">
              Viabilidade: <b>{rotuloProcesso(atual)}</b>
              {atual.clienteNome ? ` · cliente ${atual.clienteNome}` : ' · sem cliente'}
              {atual.exemplo ? ' · exemplo com dados do PE 037/2026 FAMESP' : ''}
            </div>
          )}
          {tela}
        </main>
      </div>
      {modal && (
        <NovaViabilidade
          key={modal.etapa + (modal.clienteId || '')}
          estado={modal}
          clientes={clientes}
          fechar={fecharModal}
          escolherCliente={(id) => setModal(id ? { etapa: 'inicio', clienteId: id } : { etapa: 'cliente' })}
          cadastrarCliente={() => { setModal(null); abrirFormCliente(null, true) }}
          criarEmBranco={criarEmBranco}
          criarImportando={criarImportando}
          abrir={() => { const id = modal.processoId; setModal(null); selecionar(id, rotaDeBloco(BLOCOS[0])) }}
        />
      )}
    </div>
  )
}

