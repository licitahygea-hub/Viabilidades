// Utilidades compartilhadas pelas funções serverless (Vercel, Node 20+)

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Envolve o handler: método, chave de acesso (opcional) e erros em JSON
export function handler(fn) {
  return async (req, res) => {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST.')
      const chave = process.env.APP_ACCESS_KEY
      if (chave && req.headers['x-app-key'] !== chave) throw new HttpError(401, 'Chave de acesso inválida.', 'auth')
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
