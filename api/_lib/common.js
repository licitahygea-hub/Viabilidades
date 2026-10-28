// Utilidades compartilhadas pelas funções serverless (Vercel, Node 18+)

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Envolve o handler: método, chave de acesso e erros em JSON
export function handler(fn) {
  return async (req, res) => {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST.')
      const chave = process.env.APP_ACCESS_KEY
      if (chave && req.headers['x-app-key'] !== chave) throw new HttpError(401, 'Chave de acesso inválida.', 'auth')
      if (!process.env.ANTHROPIC_API_KEY && fn.needsClaude !== false) {
        throw new HttpError(500, 'ANTHROPIC_API_KEY não configurada na Vercel (Settings → Environment Variables).', 'config')
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      const out = await fn(body, req)
      res.status(200).json(out)
    } catch (e) {
      const status = e.status || 500
      if (status >= 500 && status !== 501) console.error(e)
      res.status(status).json({ error: e.message || 'Erro interno.', code: e.code })
    }
  }
}

// Chamada à API de Mensagens do Claude
export async function claude(body, { fetchImpl = fetch } = {}) {
  const r = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  })
  const text = await r.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new HttpError(502, `Resposta inválida da API do Claude (${r.status}).`)
  }
  if (!r.ok) {
    const msg = data?.error?.message || `Erro ${r.status}`
    throw new HttpError(r.status === 429 ? 429 : 502, `API do Claude: ${msg}`, data?.error?.type)
  }
  return data
}

export const toolUse = (msg, name) => msg.content?.find((b) => b.type === 'tool_use' && (!name || b.name === name))

export async function fetchJSON(url, { timeout = 15000, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const r = await fetchImpl(url, { signal: ctrl.signal, headers: { accept: 'application/json', 'user-agent': 'viabilidade-medicos/1.0' } })
    if (r.status === 204) return null
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}
