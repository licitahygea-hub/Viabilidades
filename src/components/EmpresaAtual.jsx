import { useEffect, useState } from 'react'
import { Sheet, Status, hostOf } from './ui'
import { Search, Check } from './icons'
import { callApi } from '../lib/config'
import { money, fmtDate } from '../lib/format'
import { LISTS } from '../lib/lists'

const CONF = { alta: 'ok', média: 'warn', media: 'warn', baixa: 'pending' }

function mesesEntre(ini, fim) {
  if (!ini || !fim) return null
  const a = new Date(ini)
  const b = new Date(fim)
  if (isNaN(a) || isNaN(b)) return null
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.44)))
}

// Busca de quem presta hoje o objeto (PNCP + portais de transparência + web)
export default function EmpresaAtual({ p, api }) {
  const P = p.processo
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [open, setOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const res = p.buscaEmpresa

  useEffect(() => {
    if (!busy) return
    const t0 = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(t)
  }, [busy])

  const pode = !!(P.objeto || P.municipio || P.orgao)

  const buscar = async () => {
    setErro('')
    setBusy(true)
    setElapsed(0)
    try {
      const r = await callApi('/api/empresa-atual', {
        objeto: P.objeto,
        municipio: P.municipio,
        orgao: P.orgao,
        orgaoCnpj: P.orgaoCnpj,
        numeroEdital: P.numeroEdital,
        locais: [P.local1, P.local2, P.local3, P.local4, P.local5],
        especialidades: (P.especialidades || []).map((e) => e.nome),
        hoje: new Date().toISOString().slice(0, 10),
      })
      api.setField('buscaEmpresa', { data: new Date().toISOString(), resultado: r })
      setOpen(true)
    } catch (e) {
      setErro(e.message)
    } finally {
      setBusy(false)
    }
  }

  const usar = (cand) => {
    const f0 = cand.fontes?.[0]
    const fonte = f0 ? { url: f0.url, titulo: f0.titulo, origem: 'web' } : { origem: 'conhecimento' }
    const vig = cand.vigenciaMeses || mesesEntre(cand.vigenciaInicio, cand.vigenciaFim)
    const patch = {
      atualIdentificada: 'Sim',
      atualRazao: cand.razaoSocial || null,
      atualCnpj: cand.cnpj || null,
      atualCidade: cand.cidadeUf || null,
      atualAdministrador: cand.administrador || null,
      atualPorte: LISTS.Porte.includes(cand.porte) ? cand.porte : null,
      atualContrato: cand.numeroContrato || null,
      atualValorGlobal: Number.isFinite(cand.valorGlobal) ? cand.valorGlobal : null,
      vigContrato: vig || P.vigContrato || 12,
      atualItens: [cand.itensValores, cand.vigenciaInicio && `Vigência: ${fmtDate(cand.vigenciaInicio)} a ${fmtDate(cand.vigenciaFim) || '?'}`, cand.objeto && `Objeto: ${cand.objeto}`].filter(Boolean).join('\n') || null,
    }
    const limpo = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null && v !== undefined && v !== ''))
    const fontes = Object.fromEntries(Object.keys(limpo).filter((k) => k !== 'atualIdentificada').map((k) => [k, fonte]))
    api.patchProcesso(limpo, fontes)
    setOpen(false)
  }

  const r = res?.resultado
  const top = r?.candidatos?.[0]

  return (
    <div className="empresa-busca">
      <div className="empresa-row">
        <button className="btn btn-primary" onClick={buscar} disabled={busy || !pode}>
          <Search size={18} /> {res ? 'Buscar novamente' : 'Buscar empresa atual'}
        </button>
        {res && !busy && (
          <button className="btn" onClick={() => setOpen(true)}>
            Ver resultado ({r?.candidatos?.length || 0})
          </button>
        )}
      </div>
      <p className="small muted">
        {pode
          ? 'Consulta o PNCP, portais da transparência, tribunais de contas, diários oficiais e a web a partir do objeto, órgão e local de execução.'
          : 'Preencha o objeto e o município (ou o órgão) para buscar.'}
      </p>
      {busy && (
        <div className="progress" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Pesquisando no PNCP e na web… {elapsed}s (pode levar até 3 minutos)</span>
        </div>
      )}
      {erro && <p className="small neg">{erro}</p>}
      {top && !busy && (
        <p className="small">
          Mais provável: <strong>{top.razaoSocial}</strong> <Status kind={CONF[top.confianca] || 'pending'}>Confiança {top.confianca}</Status>
        </p>
      )}

      {open && r && (
        <Sheet open size="lg" onClose={() => setOpen(false)} title="Empresa atual: resultado da busca">
          <p>{r.resumo}</p>
          <p className="small muted">
            {res.data && `Busca em ${new Date(res.data).toLocaleString('pt-BR')}. `}
            {r.pncpEncontrados ?? 0} registro(s) do PNCP analisados{r.buscaWeb === false ? '; busca na web indisponível' : ''}.
          </p>
          {r.avisos?.length > 0 && <p className="small warn-text">{r.avisos.join(' · ')}</p>}
          <ol className="cand-list">
            {(r.candidatos || []).map((cd, i) => (
              <li key={i} className="card">
                <div className="card-head">
                  <span className="card-num">{i + 1}</span>
                  <strong className="card-title">{cd.razaoSocial}</strong>
                  <Status kind={CONF[cd.confianca] || 'pending'}>Confiança {cd.confianca}</Status>
                  {cd.vigente === true && <Status kind="ok">Vigente</Status>}
                </div>
                <dl className="card-results grid">
                  <div><dt>CNPJ</dt><dd>{cd.cnpj || '—'}</dd></div>
                  <div><dt>Contrato</dt><dd>{cd.numeroContrato || '—'}</dd></div>
                  <div><dt>Valor global</dt><dd>{Number.isFinite(cd.valorGlobal) ? money(cd.valorGlobal) : '—'}</dd></div>
                  <div><dt>Vigência</dt><dd>{cd.vigenciaInicio ? `${fmtDate(cd.vigenciaInicio)} a ${fmtDate(cd.vigenciaFim) || '?'}` : cd.vigenciaMeses ? `${cd.vigenciaMeses} meses` : '—'}</dd></div>
                </dl>
                {cd.justificativa && <p className="small">{cd.justificativa}</p>}
                {cd.itensValores && <p className="small muted">Itens/valores: {cd.itensValores}</p>}
                {cd.fontes?.length > 0 && (
                  <ul className="fontes">
                    {cd.fontes.map((f, j) => (
                      <li key={j}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer">{f.titulo || hostOf(f.url)}</a>
                        <span className="small muted"> ({hostOf(f.url)})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="btn" onClick={() => usar(cd)}>
                  <Check size={18} /> Usar esta empresa
                </button>
              </li>
            ))}
          </ol>
          {!r.candidatos?.length && <p className="muted">Nenhuma empresa identificada com segurança. Tente completar o órgão e o CNPJ do órgão e buscar de novo.</p>}
          {r.fontesConsultadas?.length > 0 && <p className="small muted">Consultado: {r.fontesConsultadas.join(', ')}.</p>}
          <p className="small muted">Resultado gerado por IA a partir de fontes públicas. Confirme no contrato ou no portal antes de usar no comitê.</p>
        </Sheet>
      )}
    </div>
  )
}
