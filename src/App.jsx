import { useEffect, useMemo, useState } from 'react'
import { BLOCOS, DESTINOS, NOMES_DESTINO, ORIGEM_CONFIG } from './config/regras.js'
import { analisar, rotuloProcesso } from './lib/calculos.js'
import { slug } from './lib/formato.js'
import { situacaoBloco } from './lib/validacao.js'
import { carregar, novoId, novoProcesso, salvar } from './lib/armazenamento.js'
import Bloco from './screens/Bloco.jsx'
import TelaDestino from './screens/TelaDestino.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Processos from './screens/Processos.jsx'

// Rotas por hash: #dashboard · #processos · #bloco-processo · #tela-cliente · #tela-margem · #agenda
const rotaDeBloco = (b) => 'bloco-' + slug(b)
const rotaDeDestino = (d) => (d === 'agenda' ? 'agenda' : 'tela-' + d)
const lerRota = () => (typeof location !== 'undefined' ? location.hash.replace('#', '') : '') || 'dashboard'

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

  const processos = dados.processos
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

  const mudarAtual = (fn) =>
    setDados((d) => ({
      ...d,
      processos: d.processos.map((p) => (p.id === (d.atualId || d.processos[0]?.id) ? { ...fn(p), atualizadoEm: new Date().toISOString() } : p)),
    }))
  const alterarValor = (campoId, v) => mudarAtual((p) => ({ ...p, valores: { ...p.valores, [campoId]: v } }))
  const alterarGrupo = (grupo, rows) => mudarAtual((p) => ({ ...p, grupos: { ...p.grupos, [grupo]: rows } }))

  const selecionar = (id, r) => { setDados((d) => ({ ...d, atualId: id })); if (r) irPara(r) }
  const criar = () => {
    const p = novoProcesso(atual)
    setDados((d) => ({ processos: [p, ...d.processos], atualId: p.id }))
    irPara(rotaDeBloco(BLOCOS[0]))
  }
  const duplicar = (id) => {
    const o = processos.find((p) => p.id === id)
    const copia = JSON.parse(JSON.stringify(o))
    Object.assign(copia, { id: novoId(), exemplo: false, criadoEm: new Date().toISOString() })
    for (const g of Object.keys(copia.grupos || {})) copia.grupos[g] = copia.grupos[g].map((r) => ({ ...r, _id: novoId() }))
    setDados((d) => ({ processos: [copia, ...d.processos], atualId: copia.id }))
  }
  const excluir = (id) =>
    setDados((d) => {
      const resto = d.processos.filter((p) => p.id !== id)
      const lista = resto.length ? resto : [novoProcesso(d.processos.find((p) => p.id === id))]
      return { processos: lista, atualId: d.atualId === id ? lista[0].id : d.atualId }
    })
  const importar = (lista) =>
    setDados((d) => {
      const ids = new Set(lista.map((p) => p.id))
      return { processos: [...lista, ...d.processos.filter((p) => !ids.has(p.id))], atualId: lista[0]?.id || d.atualId }
    })

  // Tela atual
  let tela = null
  let titulo = 'Dashboard'
  const blocoDaRota = BLOCOS.find((b) => rotaDeBloco(b) === rota)
  const destinoDaRota = DESTINOS.find((d) => rotaDeDestino(d) === rota)
  if (rota === 'processos') {
    titulo = 'Processos'
    tela = <Processos processos={processos} atualId={atual?.id} selecionar={(id) => selecionar(id, rotaDeBloco(BLOCOS[0]))} criar={criar} duplicar={duplicar} excluir={excluir} importar={importar} />
  } else if (blocoDaRota && atual) {
    titulo = blocoDaRota
    tela = <Bloco key={atual.id + blocoDaRota} bloco={blocoDaRota} proc={atual} analise={analise} alterarValor={alterarValor} alterarGrupo={alterarGrupo} irPara={irPara} />
  } else if (destinoDaRota && atual) {
    titulo = destinoDaRota === 'agenda' ? 'Agenda' : 'Tela ' + (NOMES_DESTINO[destinoDaRota] || destinoDaRota)
    tela = <TelaDestino destino={destinoDaRota} proc={atual} analise={analise} processos={processos} irPara={irPara} selecionar={(id) => selecionar(id)} />
  } else {
    tela = <Dashboard processos={processos} filtros={filtros} setFiltros={setFiltros} abrir={(id) => selecionar(id, 'tela-margem')} />
  }


  return (
    <div className={'app' + (menuAberto ? ' aberto' : '')}>
      <aside className="side" aria-label="Menu">
        <div className="side-brand">
          <b>Viabilidade Licitações</b>
          <span>Modelo Margem Médicos · serviços médicos</span>
        </div>
        <div className="side-proc">
          <label htmlFor="sel-processo">Processo em edição</label>
          <select id="sel-processo" value={atual?.id || ''} onChange={(e) => selecionar(e.target.value)}>
            {processos.map((p) => <option key={p.id} value={p.id}>{rotuloProcesso(p)}</option>)}
          </select>
        </div>
        <nav>
          <div className="nav-grupo">
            <ItemMenu rota={rota} irPara={irPara} r="dashboard">Dashboard</ItemMenu>
            <ItemMenu rota={rota} irPara={irPara} r="processos" extra={<span className="cnt">{processos.length}</span>}>Processos</ItemMenu>
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
          {atual && rota !== 'processos' && rota !== 'dashboard' && (
            <div className="salvo">Processo: <b>{rotuloProcesso(atual)}</b>{atual.exemplo ? ' · exemplo com dados do PE 037/2026 FAMESP' : ''}</div>
          )}
          {tela}
        </main>
      </div>
    </div>
  )
}
