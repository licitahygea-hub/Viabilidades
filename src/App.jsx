import { useMemo, useState } from 'react'
import {
  ArrowLeft, LayoutDashboard, FileText, ClipboardList, Calculator, Ellipsis,
  Gavel, Users, ChartLine, Presentation, SlidersHorizontal,
} from './components/icons'
import { useProcesses, useHashRoute } from './lib/store'
import { compute } from './lib/calc'
import { patchProcesso } from './lib/comite'
import { Sheet, Status } from './components/ui'
import Home from './screens/Home'
import Painel from './screens/Painel'
import Processo from './screens/Processo'
import TR from './screens/TR'
import Margem from './screens/Margem'
import Simulador from './screens/Simulador'
import Concorrentes from './screens/Concorrentes'
import Projecao from './screens/Projecao'
import Apresentacao from './screens/Apresentacao'
import Premissas from './screens/Premissas'

const TABS = [
  { id: 'painel', label: 'Painel', icon: LayoutDashboard, Screen: Painel, primary: true },
  { id: 'processo', label: 'Processo', icon: FileText, Screen: Processo, primary: true },
  { id: 'tr', label: 'TR', icon: ClipboardList, Screen: TR, primary: true },
  { id: 'margem', label: 'Margem', icon: Calculator, Screen: Margem, primary: true },
  { id: 'simulador', label: 'Simulador de lances', short: 'Lances', icon: Gavel, Screen: Simulador },
  { id: 'concorrentes', label: 'Concorrentes', icon: Users, Screen: Concorrentes },
  { id: 'projecao', label: 'Projeção 10 anos', short: 'Projeção', icon: ChartLine, Screen: Projecao },
  { id: 'apresentacao', label: 'Quadro do comitê', short: 'Comitê', icon: Presentation, Screen: Apresentacao },
  { id: 'premissas', label: 'Premissas', icon: SlidersHorizontal, Screen: Premissas },
]

export default function App() {
  const store = useProcesses()
  const [route, go] = useHashRoute()
  const [moreOpen, setMoreOpen] = useState(false)

  const proc = route.id ? store.processes.find((p) => p.id === route.id) : null
  const c = useMemo(() => (proc ? compute(proc) : null), [proc])

  if (!proc) {
    return <Home store={store} go={go} missing={!!route.id} />
  }

  const tab = TABS.find((t) => t.id === route.tab) || TABS[0]
  const Screen = tab.Screen

  // API de edição repassada às telas
  const set = (fn) => store.update(proc.id, fn)
  const api = {
    set,
    // edição manual: aplica regras (data do comitê) e remove a indicação de fonte automática
    setProcesso: (k, v) =>
      set((p) => {
        const fontes = { ...p.fontes }
        delete fontes[k]
        return { ...p, processo: patchProcesso(p.processo, { [k]: v }), fontes }
      }),
    patchProcesso: (patch, fontes = {}) => set((p) => ({ ...p, processo: patchProcesso(p.processo, patch), fontes: { ...p.fontes, ...fontes } })),
    patch: (p, patch) => ({ ...p, processo: patchProcesso(p.processo, patch) }),
    setPremissa: (k, v) => set((p) => ({ ...p, premissas: { ...p.premissas, [k]: v } })),
    setField: (k, v) => set((p) => ({ ...p, [k]: v })),
    listAdd: (list, item) => set((p) => ({ ...p, [list]: [...p[list], item] })),
    listUpdate: (list, id, patch) => set((p) => ({ ...p, [list]: p[list].map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    listRemove: (list, id) => set((p) => ({ ...p, [list]: p[list].filter((x) => x.id !== id) })),
    listMove: (list, id, dir) =>
      set((p) => {
        const arr = [...p[list]]
        const i = arr.findIndex((x) => x.id === id)
        const j = i + dir
        if (i < 0 || j < 0 || j >= arr.length) return p
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        return { ...p, [list]: arr }
      }),
    go: (t) => go(proc.id, t),
  }

  const title = proc.processo.descritivo || 'Viabilidade sem descritivo'
  const moreActive = !tab.primary

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Seções">
        <button className="side-back" onClick={() => go(null)}>
          <ArrowLeft size={18} /> Todas as viabilidades
        </button>
        <nav>
          {TABS.map((t) => (
            <a key={t.id} href={`#/p/${proc.id}/${t.id}`} className={t.id === tab.id ? 'active' : ''} aria-current={t.id === tab.id ? 'page' : undefined}>
              <t.icon size={18} aria-hidden="true" />
              {t.label}
            </a>
          ))}
        </nav>
        <p className="side-foot">Os dados ficam salvos neste navegador. Exporte um backup na tela inicial.</p>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" onClick={() => go(null)} aria-label="Voltar para a lista">
            <ArrowLeft size={20} />
          </button>
          <div className="topbar-title">
            <span className="topbar-proc" title={title}>{title}</span>
            <span className="topbar-tab">{tab.label}</span>
          </div>
          <Status kind={c.verdict.kind}>{c.verdict.title}</Status>
        </header>

        {store.saveError && <div className="banner-error">Não foi possível salvar no navegador. Exporte um backup para não perder os dados.</div>}

        <main className="content">
          <Screen p={proc} c={c} api={api} />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Seções">
        {TABS.filter((t) => t.primary).map((t) => (
          <a key={t.id} href={`#/p/${proc.id}/${t.id}`} className={t.id === tab.id ? 'active' : ''} aria-current={t.id === tab.id ? 'page' : undefined}>
            <t.icon size={21} aria-hidden="true" />
            <span>{t.short || t.label}</span>
          </a>
        ))}
        <button className={moreActive ? 'active' : ''} onClick={() => setMoreOpen(true)}>
          <Ellipsis size={21} aria-hidden="true" />
          <span>{moreActive ? tab.short || tab.label : 'Mais'}</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais seções">
        <div className="more-list">
          {TABS.filter((t) => !t.primary).map((t) => (
            <a key={t.id} href={`#/p/${proc.id}/${t.id}`} onClick={() => setMoreOpen(false)} className={t.id === tab.id ? 'active' : ''}>
              <t.icon size={20} aria-hidden="true" />
              {t.label}
            </a>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
