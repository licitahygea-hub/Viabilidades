// Padronização das entradas conforme colunas G (tipo), H (opções) e I (preenchimento)
import { CAPITAIS, CAMPOS, LISTA_UFS, OBRIG, tipoDe } from '../config/regras.js'
import { avaliarExpressao, cnpjValido, vazio } from './formato.js'
import { efetivo, linhas } from './calculos.js'

export function validar(campo, v) {
  if (vazio(v)) return null
  const t = tipoDe(campo)
  if (campo.especial === 'municipio-uf') {
    const m = /^(.+)\/([A-Z]{2})$/.exec(String(v))
    if (!m) return 'Informe o município e escolha a UF.'
    if (!LISTA_UFS.includes(m[2])) return 'UF inválida.'
    if (!/^[A-Za-zÀ-ÿ' .-]{2,}$/.test(m[1].trim())) return 'Use apenas letras no nome do município.'
    return null
  }
  if (campo.especial === 'capital') return CAPITAIS.includes(v) ? null : 'Escolha uma capital da lista.'
  if (campo.especial === 'cnpj') return cnpjValido(v) ? null : 'CNPJ inválido (confira os dígitos).'
  if (campo.especial === 'uf') return LISTA_UFS.includes(v) ? null : 'Escolha uma UF da lista.'
  switch (t) {
    case 'lista':
      return campo.opcoes.includes(v) ? null : 'Escolha uma opção da lista.'
    case 'data': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Data no formato dd/mm/aaaa.'
      const d = new Date(v + 'T12:00:00')
      return isNaN(d) ? 'Data inválida.' : null
    }
    case 'hora':
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : 'Hora no formato hh:mm.'
    case 'moeda':
    case 'numero':
      return typeof v === 'number' && isFinite(v) && v >= 0 ? null : 'Informe um número maior ou igual a zero.'
    case 'percentual':
      return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1 ? null : 'Percentual entre 0% e 100%.'
    case 'moeda-ou-sigiloso':
      return v === 'Sigiloso' || (typeof v === 'number' && isFinite(v) && v >= 0) ? null : 'Informe o valor ou marque Sigiloso.'
    case 'expressao': {
      const n = avaliarExpressao(v)
      return isFinite(n) && n >= 0 ? null : 'Use um número ou uma conta simples, ex.: =2920/12.'
    }
    case 'texto-longo':
      return String(v).length > 4000 ? 'Máximo de 4.000 caracteres.' : null
    default:
      return String(v).length > 300 ? 'Máximo de 300 caracteres.' : null
  }
}

// Situação de preenchimento de um bloco: obrigatórios atendidos e erros de formato
export function situacaoBloco(proc, analise, bloco) {
  const campos = CAMPOS.filter((c) => c.bloco === bloco)
  let total = 0, ok = 0, erros = 0
  const pend = []
  for (const c of campos.filter((x) => !x.repete)) {
    const { valor } = efetivo(proc, analise, c)
    if (validar(c, valor)) erros++
    if (OBRIG(c)) {
      total++
      if (!vazio(valor)) ok++
      else pend.push(c.parametro)
    }
  }
  const grupos = [...new Set(campos.filter((c) => c.repete).map((c) => c.grupo))]
  for (const g of grupos) {
    const cg = campos.filter((c) => c.grupo === g)
    const rows = linhas(proc, g)
    const exige = cg.some(OBRIG)
    if (exige && rows.length === 0) { total++; pend.push('Ao menos 1 linha em ' + cg[0].secao) }
    for (const r of rows) {
      for (const c of cg) {
        const { valor } = efetivo(proc, analise, c, r)
        if (validar(c, valor)) erros++
        if (OBRIG(c)) {
          total++
          if (!vazio(valor)) ok++
          else pend.push(`${c.parametro} (linha ${rows.indexOf(r) + 1})`)
        }
      }
    }
  }
  return { total, ok, erros, pend, completo: total === ok && erros === 0 }
}
