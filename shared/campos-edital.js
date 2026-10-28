// Definição dos campos que a IA extrai do edital (usada pela função /api/extrair-edital e pela tela de revisão)
import { PROCESSO_SECTIONS } from '../src/lib/model.js'
import { LISTS } from '../src/lib/lists.js'

// Campos da aba Processo que podem vir dos documentos (ou de conhecimento geral, quando indicado)
export const CAMPOS_EXTRAIVEIS = {
  descritivo: 'Monte no padrão "Cidade UF - PE nn aaaa - Abertura dd mm aaaa" (ex.: "Jaboatão dos Guararapes PE - PE 045 2026 - Abertura 18 11 2026"). Use a sigla da modalidade (PE pregão eletrônico, PP presencial, CC concorrência, DL dispensa, CR credenciamento).',
  municipio: 'Município e UF do órgão/execução, ex.: "Jaboatão dos Guararapes/PE".',
  orgao: 'Nome do órgão ou entidade contratante.',
  orgaoCnpj: 'CNPJ do órgão contratante, formato 00.000.000/0000-00.',
  capital: 'Capital do estado (pode vir de conhecimento geral: origem "conhecimento").',
  distancia: 'Distância aproximada em km entre o município e a capital (conhecimento geral, origem "conhecimento").',
  habitantes: 'População aproximada do município segundo o IBGE (conhecimento geral, origem "conhecimento").',
  modalidade: 'Modalidade da licitação.',
  numeroEdital: 'Número do edital e/ou do processo administrativo, como aparece no documento.',
  linkProcesso: 'Endereço (URL) do processo no PNCP ou portal de compras, se constar.',
  dataSessao: 'Data da sessão pública / abertura da disputa, formato AAAA-MM-DD.',
  horaSessao: 'Horário da sessão, formato HH:MM (horário de Brasília).',
  tipoLicitacao: 'Critério de julgamento.',
  modoDisputa: 'Modo de disputa.',
  objeto: 'Objeto resumido em até 3 linhas.',
  local1: 'Primeiro local/unidade de execução dos serviços.',
  local2: 'Segundo local de execução, se houver.',
  local3: 'Terceiro local de execução, se houver.',
  local4: 'Quarto local de execução, se houver.',
  local5: 'Quinto local de execução, se houver (se houver mais, cite os principais).',
  estimadoGlobal: 'Valor estimado global da contratação (para o lote/objeto todo), em reais, número sem formatação.',
  vigencia: 'Vigência do contrato em meses (número inteiro).',
  renovacao: 'Possibilidade de prorrogação/renovação.',
  inicioContrato: 'Início previsto do contrato, formato AAAA-MM-DD, se constar.',
  garantiaProposta: 'Exige garantia de proposta?',
  garantiaContratual: 'Exige garantia contratual?',
  quadroCoord: 'O quadro de serviços/planilha prevê coordenação, responsável técnico ou diretor técnico como item?',
  trCoord: 'O termo de referência exige coordenação, RT ou diretor técnico (mesmo sem item próprio)?',
  subcontratacao: 'Permite subcontratação?',
  pctSub: 'Percentual máximo de subcontratação permitido, de 0 a 100.',
  cooperativa: 'Permite participação de cooperativas?',
  os: 'Permite participação de Organização Social?',
  oscip: 'Permite participação de OSCIP?',
  consorcio: 'Permite participação em consórcio?',
  epi: 'Quem fornece EPI (contratante ou contratada)?',
  alimentacao: 'Quem fornece alimentação aos profissionais (contratante ou contratada)?',
  descritivoEquipe: 'Resumo da equipe técnica exigida (profissionais, quantidades, cargas, requisitos).',
  exigeCursos: 'Exige cursos de extensão (ACLS, ATLS, PALS etc.)?',
  quaisCursos: 'Quais cursos são exigidos.',
  posGrad: 'Aceita pós-graduação (lato sensu) no lugar de título/RQE?',
  especialistaTitulo: 'Exige médico especialista com título (sem exigir RQE)?',
  especialistaRQE: 'Exige médico especialista com RQE registrado no CRM?',
}

const allFields = Object.fromEntries(PROCESSO_SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]))

export function campoDef(key) {
  return allFields[key]
}

function valorSchema(f) {
  switch (f.type) {
    case 'select':
      return { type: 'string', enum: LISTS[f.list] }
    case 'int':
      return { type: 'integer' }
    case 'money':
    case 'number':
    case 'percent':
      return { type: 'number' }
    case 'date':
      return { type: 'string', description: 'AAAA-MM-DD' }
    case 'time':
      return { type: 'string', description: 'HH:MM' }
    default:
      return { type: 'string' }
  }
}

const fonteProps = {
  arquivo: { type: 'string', description: 'Nome do arquivo onde a informação está' },
  pagina: { type: ['integer', 'null'], description: 'Número da página (marcador [p. N]); null se não houver' },
  trecho: { type: 'string', description: 'Trecho literal curto (até 200 caracteres) que comprova o valor' },
}

export function toolSchema() {
  const props = {}
  for (const [key, desc] of Object.entries(CAMPOS_EXTRAIVEIS)) {
    const f = allFields[key]
    if (!f) continue
    props[key] = {
      type: 'object',
      description: `${f.label}. ${desc}`,
      properties: {
        valor: valorSchema(f),
        origem: { type: 'string', enum: ['documento', 'conhecimento'] },
        ...fonteProps,
      },
      required: ['valor', 'origem'],
    }
  }
  return {
    name: 'registrar_dados_edital',
    description: 'Registra os dados extraídos do edital e anexos. Inclua somente os campos encontrados (ou, quando permitido, de conhecimento geral).',
    input_schema: {
      type: 'object',
      properties: {
        campos: { type: 'object', properties: props, description: 'Campos da aba Processo. Omita os que não constam.' },
        especialidades: {
          type: 'array',
          description: 'Especialidades médicas exigidas no objeto/equipe técnica.',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string', description: 'Nome da especialidade, preferindo o nome oficial do CFM' },
              modalidade: { type: 'string', enum: ['RQE', 'Pós', 'Não especificado'], description: 'RQE se exigir especialista com RQE/título; Pós se aceitar pós-graduação' },
              ...fonteProps,
            },
            required: ['nome', 'modalidade'],
          },
        },
        itensTR: {
          type: 'array',
          description: 'Quadro de itens do Termo de Referência / modelo de proposta.',
          items: {
            type: 'object',
            properties: {
              profissional: { type: 'string' },
              local: { type: 'string' },
              cargaTexto: { type: 'string', description: 'Carga como escrita no TR' },
              base: { type: 'string', enum: LISTS.BaseCarga },
              qtd: { type: 'number', description: 'Quantidade na base escolhida (ex.: 24 para "24h/dia")' },
              nProf: { type: 'integer', description: 'Nº de profissionais quando a carga é por profissional; senão 1' },
              valorHora: { type: ['number', 'null'], description: 'Valor unitário/hora estimado, se houver' },
              valorTR: { type: ['number', 'null'], description: 'Valor mensal do item no TR, se houver' },
              ...fonteProps,
            },
            required: ['profissional', 'base', 'qtd'],
          },
        },
        observacoes: { type: 'string', description: 'Pontos de atenção relevantes para a precificação (até 8 linhas)' },
      },
      required: ['campos'],
    },
  }
}
