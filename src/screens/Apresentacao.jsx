import { useState } from 'react'
import { ClipboardCopy, Check } from '../components/icons'
import { money, pct, num } from '../lib/format'
import { PageHead, Panel, Empty } from '../components/ui'

export default function Apresentacao({ c }) {
  const [copied, setCopied] = useState(false)
  const itens = c.itens.filter((i) => i.filled)

  const header = ['Descrição', 'Quantidade mensal', 'Valor faturar/receber', 'Faturamento mensal', 'Valor a pagar', 'Pagamento mensal', 'Margem por item', 'Faturamento', 'Imposto', 'Pagamento', 'Taxa administração']
  const body = itens.map((i) => [i.descricao, num(i.qtd, 2), money(i.prop), money(i.fat), money(i.pagar), money(i.custo), pct(i.margem, 2), money(i.fat), money(i.trib), money(i.custo), money(i.res)])
  const total = ['VALORES TOTAIS MENSAIS', '', '-', money(c.fatMensal), '-', money(c.custoMensal), '-', money(c.fatMensal), money(c.tribItens), money(c.custoMensal), money(c.resItens)]

  const copy = async () => {
    const tsv = [header, ...body, total].map((r) => r.join('\t')).join('\n')
    const html =
      '<table border="1" style="border-collapse:collapse;font-family:Arial;font-size:11px">' +
      [header, ...body, total]
        .map((r, ri) => '<tr>' + r.map((v) => (ri === 0 ? `<th style="background:#102a43;color:#fff;padding:4px">${v}</th>` : `<td style="padding:4px">${v}</td>`)).join('') + '</tr>')
        .join('') +
      '</table>'
    try {
      if (window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ 'text/plain': new Blob([tsv], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })])
      } else {
        await navigator.clipboard.writeText(tsv)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copie o quadro abaixo:', tsv)
    }
  }

  return (
    <div className="stack">
      <PageHead title="Quadro do comitê">Montado automaticamente a partir da aba Margem. Copie e cole direto no slide ou no Excel.</PageHead>
      <Panel
        title={`Margem ${pct(c.margemTotal, 2)}`}
        actions={
          <button className="btn btn-primary" onClick={copy} disabled={!itens.length}>
            {copied ? <Check size={18} /> : <ClipboardCopy size={18} />} {copied ? 'Quadro copiado' : 'Copiar quadro'}
          </button>
        }
      >
        {itens.length === 0 ? (
          <Empty title="Sem itens na Margem">Preencha a descrição dos itens na aba Margem para montar o quadro.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table pres-table">
              <thead>
                <tr>{header.map((h) => <th key={h} className={h === 'Descrição' ? '' : 'num'}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {body.map((r, i) => (
                  <tr key={i}>{r.map((v, j) => <td key={j} className={j ? 'num' : ''}>{v}</td>)}</tr>
                ))}
                <tr className="strong total">{total.map((v, j) => <td key={j} className={j ? 'num' : ''}>{v}</td>)}</tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
