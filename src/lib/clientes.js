// Cadastro de clientes (órgãos contratantes). Os campos de localização do bloco Processo
// que vão para a tela Cliente passam a vir do cadastro do cliente.
import { CAMPOS, OBRIG, UFS } from '../config/regras.js'
import { vazio } from './formato.js'
import { validar } from './validacao.js'

const base = { bloco: 'Cliente', celula: '', destinos: ['cliente'], opcoes: [], repete: false, grupo: null, observacao: '' }

export const CAMPO_NOME = {
  ...base, id: 'cliente__nome', secao: 'Cadastro do cliente', parametro: 'Nome do cliente / órgão', slug: 'nome-do-cliente',
  tipo: 'Texto', preenchimento: 'Obrigatório', exemplo: 'Prefeitura Municipal de Palmeira', especial: null,
  observacao: 'Como o órgão aparece no edital',
}
export const CAMPO_CNPJ = {
  ...base, id: 'cliente__cnpj', secao: 'Cadastro do cliente', parametro: 'CNPJ do órgão', slug: 'cnpj-do-orgao',
  tipo: 'Texto', preenchimento: 'Opcional', exemplo: '', especial: 'cnpj',
}

const ehDoCliente = (c) =>
  c.bloco === 'Processo' && !c.repete && c.destinos.includes('cliente') && (c.especial === 'municipio-uf' || c.especial === 'capital' || c.slug.startsWith('distancia'))

export const CAMPOS_DO_CLIENTE = CAMPOS.filter(ehDoCliente)
export const CAMPOS_DO_CLIENTE_IDS = CAMPOS_DO_CLIENTE.map((c) => c.id)
export const CAMPOS_CADASTRO_CLIENTE = [CAMPO_NOME, CAMPO_CNPJ, ...CAMPOS_DO_CLIENTE]

const campoMunicipio = CAMPOS_DO_CLIENTE.find((c) => c.especial === 'municipio-uf')
const campoCapital = CAMPOS_DO_CLIENTE.find((c) => c.especial === 'capital')

export const nomeCliente = (c) => c?.valores?.[CAMPO_NOME.id] || 'Cliente sem nome'
export const municipioCliente = (c) => (campoMunicipio ? c?.valores?.[campoMunicipio.id] || '' : '')
export const ufCliente = (c) => /\/([A-Z]{2})$/.exec(municipioCliente(c))?.[1] || ''
export const cidadeCliente = (c) => municipioCliente(c).replace(/\/[A-Z]{2}$/, '').trim()

// Valores automáticos do cadastro (capital pela UF)
export function padroesCliente(valores) {
  const uf = /\/([A-Z]{2})$/.exec(campoMunicipio ? valores?.[campoMunicipio.id] || '' : '')?.[1]
  return campoCapital && uf ? { [campoCapital.id]: UFS[uf] } : {}
}

export function errosCliente(valores) {
  const pad = padroesCliente(valores)
  const erros = {}
  for (const c of CAMPOS_CADASTRO_CLIENTE) {
    const v = vazio(valores?.[c.id]) ? pad[c.id] : valores[c.id]
    const e = validar(c, v) || (OBRIG(c) && vazio(v) ? 'Campo obrigatório.' : null)
    if (e) erros[c.id] = e
  }
  return erros
}

// Normaliza: grava a capital automática e tira espaços do município
export function finalizarCliente(valores) {
  const v = { ...valores, ...Object.fromEntries(Object.entries(padroesCliente(valores)).filter(([k]) => vazio(valores[k]))) }
  if (campoMunicipio && v[campoMunicipio.id]) v[campoMunicipio.id] = v[campoMunicipio.id].replace(/\s+\//, '/').trim()
  if (v[CAMPO_NOME.id]) v[CAMPO_NOME.id] = v[CAMPO_NOME.id].trim()
  return v
}

// Copia os dados do cliente para o processo (de/para)
export function aplicarCliente(proc, cliente) {
  const valores = { ...proc.valores }
  for (const c of CAMPOS_DO_CLIENTE) {
    if (vazio(cliente.valores?.[c.id])) delete valores[c.id]
    else valores[c.id] = cliente.valores[c.id]
  }
  return { ...proc, clienteId: cliente.id, clienteNome: nomeCliente(cliente), valores }
}
