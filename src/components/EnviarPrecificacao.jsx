import { useState } from 'react'
import { Panel, Status } from './ui'
import { Check } from './icons'
import { callApi, loadConfig } from '../lib/config'
import { dataLonga, sugerirDataComite } from '../lib/comite'
import { money, pct, fmtDate } from '../lib/format'

export function montarEmail(p, c) {
  const P = p.processo
  const descritivo = P.descritivo || 'Sem descritivo'
  const dataComite = P.comiteDataPrevista || sugerirDataComite(P.dataSessao)
  const quando = dataComite ? dataLonga(dataComite) : 'data a definir'
  const linhas = [
    'Olá,',
    '',
    `O processo "${descritivo}" está pronto para ser precificado.`,
    '',
    `Precificação (comitê): ${quando}.`,
  ]
  if (P.dataSessao) linhas.push(`Sessão de disputa: ${fmtDate(P.dataSessao)}${P.horaSessao ? ` às ${P.horaSessao}` : ''}.`)
  if (P.orgao) linhas.push(`Órgão: ${P.orgao}.`)
  if (c.estGlobal) linhas.push(`Valor estimado global: ${money(c.estGlobal)} (${c.vig} meses).`)
  const n = c.itens.filter((i) => i.filled).length
  if (n) linhas.push(`Itens na Margem: ${n}. Faturamento mensal: ${money(c.fatMensal)}${c.custoMensal ? `; margem atual: ${pct(c.margemTotal, 1)}` : ''}.`)
  if (P.linkProcesso) linhas.push(`Link do processo: ${P.linkProcesso}`)
  linhas.push('', 'Mensagem enviada pelo sistema de Viabilidade.')
  return {
    assunto: `Pronto para precificação: ${descritivo}`,
    texto: linhas.join('\n'),
    dataComite,
  }
}

export default function EnviarPrecificacao({ p, c, api }) {
  const [estado, setEstado] = useState(null)
  const cfg = loadConfig()
  const para = cfg.emailPrecificacao || 'licitacao@doccsc.com.br'
  const { assunto, texto, dataComite } = montarEmail(p, c)
  const nItens = c.itens.filter((i) => i.filled).length
  const semPagar = c.itens.filter((i) => i.filled && !i.pagar).length
  const enviadoEm = p.processo.precificacaoEnviadaEm

  const registrar = (modo) => api.patchProcesso({ precificacaoEnviadaEm: new Date().toISOString(), precificacaoModo: modo })

  const enviar = async () => {
    setEstado({ kind: 'busy' })
    try {
      await callApi('/api/enviar-email', { para, assunto, texto })
      registrar('direto')
      setEstado({ kind: 'ok', msg: `E-mail enviado para ${para}.` })
    } catch (e) {
      if (e.status === 501 || e.status === 404 || e.code === 'not-configured' || e.code === 'no-api') {
        // sem envio direto configurado: abre o e-mail pronto no aplicativo de e-mail
        window.location.href = `mailto:${para}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`
        registrar('mailto')
        setEstado({ kind: 'ok', msg: 'Abrimos o e-mail pronto no seu aplicativo de e-mail. Confira e clique em Enviar.' })
      } else {
        setEstado({ kind: 'bad', msg: e.message })
      }
    }
  }

  return (
    <Panel title="Enviar para precificação" subtitle={`Avisa ${para} que este processo está pronto para o comitê.`}>
      <div className="email-preview">
        <p className="small muted">Assunto</p>
        <p><strong>{assunto}</strong></p>
        <p className="small muted">Mensagem</p>
        <pre>{texto}</pre>
      </div>
      {!dataComite && <p className="small warn-text">Sem data do comitê: preencha a data da sessão na aba Processo para sugerir a terça ou quinta anterior.</p>}
      {nItens === 0 && <p className="small warn-text">Ainda não há itens na Margem.</p>}
      {semPagar > 0 && <p className="small muted">{semPagar} item(ns) ainda sem valor a pagar.</p>}
      <div className="row-actions">
        <button className="btn btn-primary" onClick={enviar} disabled={estado?.kind === 'busy' || nItens === 0}>
          <Check size={18} /> {estado?.kind === 'busy' ? 'Enviando…' : 'Enviar e-mail para precificação'}
        </button>
        {enviadoEm && <Status kind="ok">Enviado em {new Date(enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Status>}
      </div>
      {estado?.msg && <p className={`small ${estado.kind === 'bad' ? 'neg' : ''}`}>{estado.msg}</p>}
    </Panel>
  )
}
