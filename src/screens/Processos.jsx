import { useRef, useState } from 'react'
import { BLOCOS } from '../config/regras.js'
import { analisar, rotuloProcesso, valor, CAMPO } from '../lib/calculos.js'
import { fmtData, fmtMoeda, fmtPct } from '../lib/formato.js'
import { situacaoBloco } from '../lib/validacao.js'

const cls = { Viável: 'ok', Atenção: 'warn', Inviável: 'bad', 'Sem dados': 'neutro' }

export default function Processos({ processos, atualId, selecionar, criar, duplicar, excluir, importar }) {
  const [confirmar, setConfirmar] = useState(null)
  const [msg, setMsg] = useState(null)
  const arquivo = useRef(null)

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ versao: 1, exportadoEm: new Date().toISOString(), processos }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `viabilidade-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const lerArquivo = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const dados = JSON.parse(await f.text())
      const lista = Array.isArray(dados) ? dados : dados.processos
      if (!Array.isArray(lista) || !lista.every((p) => p && p.id && p.valores)) throw new Error()
      importar(lista)
      setMsg(`${lista.length} processo(s) importado(s).`)
    } catch {
      setMsg('Arquivo não reconhecido. Use um backup exportado por este sistema (.json).')
    }
  }

  return (
    <>
      <header className="cab">
        <div className="cab-txt">
          <span className="eyebrow">Cadastro</span>
          <h1>Processos</h1>
          <p>Cada processo é uma licitação com os dados das abas do modelo. Os dados ficam salvos neste navegador.</p>
        </div>
        <div className="acoes">
          <button type="button" className="btn pri" onClick={criar}>+ Nova viabilidade</button>
          <button type="button" className="btn" onClick={exportar}>Exportar backup</button>
          <button type="button" className="btn" onClick={() => arquivo.current?.click()}>Importar backup</button>
          <input ref={arquivo} id="importar-backup" type="file" accept="application/json,.json" hidden onChange={lerArquivo} />
        </div>
      </header>
      {msg && <div className="aviso info">{msg}</div>}

      <div className="cartoes">
        {processos.map((p) => {
          const a = analisar(p)
          const sits = BLOCOS.map((b) => situacaoBloco(p, a, b))
          const tot = sits.reduce((s, x) => s + x.total, 0), ok = sits.reduce((s, x) => s + x.ok, 0)
          return (
            <article key={p.id} className={'cartao' + (p.id === atualId ? ' atual' : '')}>
              <div className="linha-info">
                <span className="num">{fmtData(valor(p, CAMPO.data))}</span>
                <span className={'pill ' + cls[a.situacao]}>{a.situacao}</span>
                {p.exemplo && <span className="pill neutro">Exemplo</span>}
              </div>
              <h3>{rotuloProcesso(p)}</h3>
              <span className="origem">{p.clienteNome ? 'Cliente: ' + p.clienteNome : 'Sem cliente atribuído'}</span>
              <div className="par"><span>Valor global</span><b>{fmtMoeda(a.valorGlobal)}</b></div>
              <div className="par"><span>Margem</span><b>{fmtPct(a.margem)}</b></div>
              <div className="par"><span>Obrigatórios</span><b>{ok}/{tot}</b></div>
              <div className="acoes">
                <button type="button" className="btn peq pri" onClick={() => selecionar(p.id)}>Abrir</button>
                <button type="button" className="btn peq" onClick={() => duplicar(p.id)}>Duplicar</button>
                {confirmar === p.id ? (
                  <>
                    <button type="button" className="btn peq perigo conf" onClick={() => { excluir(p.id); setConfirmar(null) }}>Excluir de vez</button>
                    <button type="button" className="btn peq" onClick={() => setConfirmar(null)}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="btn peq perigo" onClick={() => setConfirmar(p.id)}>Excluir</button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
