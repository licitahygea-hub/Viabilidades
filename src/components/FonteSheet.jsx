import { useState } from 'react'
import { Sheet, hostOf } from './ui'
import { listDocs, openDoc } from '../lib/docs'

// Mostra de onde veio um dado: arquivo/página/trecho do edital ou link da web
export default function FonteSheet({ procId, info, onClose }) {
  const [erro, setErro] = useState('')
  if (!info) return null
  const { label, fonte } = info

  const abrir = async () => {
    setErro('')
    try {
      const docs = await listDocs(procId)
      const d = docs.find((x) => x.nome === fonte.arquivo) || docs.find((x) => fonte.arquivo && x.nome.toLowerCase().includes(String(fonte.arquivo).toLowerCase().replace(/\.[a-z]+$/, '')))
      if (!d) return setErro('O arquivo não está mais anexado neste aparelho.')
      openDoc(d, fonte.pagina)
    } catch {
      setErro('Não foi possível abrir o arquivo.')
    }
  }

  return (
    <Sheet open onClose={onClose} title={label}>
      {fonte.origem === 'derivado' ? (
        <p>{fonte.trecho || 'Valor calculado'}: obtido a partir de outro campo, não de um trecho do edital.</p>
      ) : fonte.origem === 'conhecimento' && !fonte.url ? (
        <p>Este valor não consta nos documentos e deve ser confirmado.</p>
      ) : fonte.url ? (
        <div className="fonte-box">
          <p className="small muted">Encontrado na web</p>
          <a href={fonte.url} target="_blank" rel="noopener noreferrer">{fonte.titulo || hostOf(fonte.url)}</a>
          <p className="small muted break">{fonte.url}</p>
          {fonte.trecho && <blockquote>{fonte.trecho}</blockquote>}
        </div>
      ) : (
        <div className="fonte-box">
          <p>
            <strong>{fonte.arquivo || 'Documento'}</strong>
            {fonte.pagina ? `, página ${fonte.pagina}` : ''}
          </p>
          {fonte.trecho ? <blockquote>“{fonte.trecho}”</blockquote> : <p className="small muted">Sem trecho registrado.</p>}
          <button className="btn btn-primary" onClick={abrir}>Abrir documento{fonte.pagina ? ` na página ${fonte.pagina}` : ''}</button>
          {erro && <p className="small neg">{erro}</p>}
          <p className="small muted">No celular, o documento pode abrir na primeira página; procure pelo trecho acima.</p>
        </div>
      )}
    </Sheet>
  )
}
