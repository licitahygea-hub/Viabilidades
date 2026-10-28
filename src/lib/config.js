// Configurações locais (por navegador)
const KEY = 'viabilidade-medicos:config'

export const DEFAULT_CONFIG = {
  chaveAcesso: '', // deve ser igual a APP_ACCESS_KEY na Vercel (se configurada)
  emailPrecificacao: 'licitacao@doccsc.com.br',
}

export function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Chamada às funções serverless (/api/*) com a chave de acesso
export async function callApi(path, body, { signal } = {}) {
  const cfg = loadConfig()
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-key': cfg.chaveAcesso || '' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError('Sem conexão com o servidor. Verifique a internet e tente de novo.', 0, 'network')
  }
  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    /* resposta não-JSON (ex.: timeout da Vercel) */
  }
  if (!res.ok) {
    if (res.status === 404) throw new ApiError('As funções do servidor não estão disponíveis aqui. Publique na Vercel ou rode com "vercel dev".', 404, 'no-api')
    if (res.status === 401) throw new ApiError('Chave de acesso inválida. Informe a chave em Configurações, na tela inicial.', 401, 'auth')
    if (res.status === 504 || res.status === 524) throw new ApiError('A análise demorou mais que o limite do servidor. Tente com menos arquivos.', res.status, 'timeout')
    throw new ApiError(data?.error || `Erro do servidor (${res.status}).`, res.status, data?.code)
  }
  if (!data) throw new ApiError('Resposta inválida do servidor.', res.status)
  return data
}
