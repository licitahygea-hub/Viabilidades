// POST /api/enviar-email
// Envio direto (opcional) via Resend. Sem RESEND_API_KEY e EMAIL_FROM configurados,
// responde 501 e o aplicativo abre o e-mail pronto no programa de e-mail do usuário.
import { handler, HttpError } from './_lib/common.js'

async function enviar({ para, assunto, texto }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) throw new HttpError(501, 'Envio direto não configurado.', 'not-configured')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para || '')) throw new HttpError(400, 'Destinatário inválido.')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [para], subject: String(assunto).slice(0, 300), text: String(texto).slice(0, 20000) }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new HttpError(502, `Falha no envio: ${data?.message || r.status}`)
  return { ok: true, id: data.id }
}

const fn = (body) => enviar(body)
fn.needsClaude = false
export default handler(fn)
