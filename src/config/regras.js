// Regras do sistema: leitura da configuração gerada da planilha + padronizações
import config from './parametros.json'
import { slug } from '../lib/formato.js'

export const UFS = {
  AC: 'Rio Branco', AL: 'Maceió', AP: 'Macapá', AM: 'Manaus', BA: 'Salvador', CE: 'Fortaleza',
  DF: 'Brasília', ES: 'Vitória', GO: 'Goiânia', MA: 'São Luís', MT: 'Cuiabá', MS: 'Campo Grande',
  MG: 'Belo Horizonte', PA: 'Belém', PB: 'João Pessoa', PR: 'Curitiba', PE: 'Recife', PI: 'Teresina',
  RJ: 'Rio de Janeiro', RN: 'Natal', RS: 'Porto Alegre', RO: 'Porto Velho', RR: 'Boa Vista',
  SC: 'Florianópolis', SP: 'São Paulo', SE: 'Aracaju', TO: 'Palmas',
}
export const LISTA_UFS = Object.keys(UFS).sort()
export const CAPITAIS = [...new Set(Object.values(UFS))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

export const NOMES_DESTINO = { cliente: 'Cliente', margem: 'Margem', agenda: 'Agenda' }

// Cada campo ganha: slug do parâmetro, grupo (para campos que se repetem) e "especial"
export const CAMPOS = config.campos.map((c) => {
  const s = slug(c.parametro)
  const porX = /\(por ([^)]+)\)/i.exec(c.secao)?.[1]
  const grupo = c.repete ? slug(porX || c.bloco) : null
  let especial = null
  if (s === 'municipio-uf' || s === 'cidade-uf') especial = 'municipio-uf'
  else if (s === 'capital-do-estado') especial = 'capital'
  else if (s === 'cnpj') especial = 'cnpj'
  else if (s === 'uf') especial = 'uf'
  return { ...c, slug: s, grupo, especial }
})

export const BLOCOS = config.blocos
export const DESTINOS = Object.keys(config.destinos)
export const ORIGEM_CONFIG = config.origem

export const camposDoBloco = (bloco) => CAMPOS.filter((c) => c.bloco === bloco)
export const camposDoDestino = (d) => CAMPOS.filter((c) => c.destinos.includes(d))

// Localiza um campo pelo bloco e pelo início do slug do parâmetro (tolerante a ajustes de texto)
export function acharCampo(bloco, prefixo) {
  const b = slug(bloco)
  const doBloco = CAMPOS.filter((c) => slug(c.bloco) === b)
  return doBloco.find((c) => c.slug === prefixo) || doBloco.find((c) => c.slug.startsWith(prefixo)) || null
}

export const OBRIG = (c) => /obrigat/i.test(c.preenchimento)
export const FORMULA = (c) => /f[oó]rmula/i.test(c.preenchimento)

// Tipo normalizado a partir da coluna G
export function tipoDe(c) {
  const g = slug(c.tipo)
  if (c.opcoes.length || g === 'lista') return 'lista'
  if (g.startsWith('data')) return 'data'
  if (g.startsWith('hora')) return 'hora'
  if (g.includes('moeda') && g.includes('texto')) return 'moeda-ou-sigiloso'
  if (g.includes('moeda')) return 'moeda'
  if (g.includes('percent')) return 'percentual'
  if (g.includes('numero') && g.includes('formula')) return 'expressao'
  if (g.includes('numero')) return 'numero'
  if (g.includes('longo')) return 'texto-longo'
  return 'texto'
}

export const ROTULO_TIPO = {
  lista: 'Lista', data: 'Data', hora: 'Hora', moeda: 'R$', 'moeda-ou-sigiloso': 'R$ ou Sigiloso',
  percentual: '%', expressao: 'Número / fórmula', numero: 'Número', 'texto-longo': 'Texto', texto: 'Texto',
}
