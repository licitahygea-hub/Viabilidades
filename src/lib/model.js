export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const DEFAULT_PREMISSAS = {
  iss1: 0.02, // ISS com abertura de filial (Cód. 4.01)
  iss2: 0.02, // ISS sem abertura de filial (Cód. 17.05)
  statusISS: 'Pendente',
  pis: 0.0065,
  cofins: 0.03,
  csll: 0.0108,
  ir: 0.02,
  reajFat: 0.05,
  reajMed: 0.025,
  reajInd: null, // null = acompanha o reajuste do faturamento (IPCA)
  margemMin: 0.06,
}

export const newTrItem = () => ({
  id: uid(), profissional: '', local: '', cargaTexto: '', base: 'h/mês',
  qtd: null, nProf: 1, valorHora: null, valorTR: null,
})

export const newItem = () => ({
  id: uid(), descricao: '', unidade: 'Hora', qtd: null,
  estUnit: null, propUnit: null, pagarUnit: null,
})

export const newConcorrente = () => ({
  id: uid(), razao: '', fantasia: '', cnpj: '', porte: '', administrador: '',
  representante: '', cidade: '', uf: '', valorUnit: null, valorGlobal: null,
  status: '', motivacao: '',
})

export function newProcess() {
  const now = new Date().toISOString()
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    processo: {
      vigencia: 12,
      vigContrato: 12,
      statusPesquisa: 'Pendente',
      statusComite: 'Pendente',
      decisao: 'Pendente',
      especialidades: [],
      comiteAuto: true,
    },
    fontes: {},
    extracao: null,
    buscaEmpresa: null,
    premissas: { ...DEFAULT_PREMISSAS },
    tr: [newTrItem()],
    trObs: '',
    itens: [newItem()],
    indiretos: { coord: null, outras: null, adm: null },
    simulador: { passo: 0.025, ate: 0.4, lanceTeste: null },
    concorrentes: [],
  }
}

// Completa campos ausentes (backups antigos / importados)
export function normalize(p) {
  const base = newProcess()
  return {
    ...base,
    ...p,
    processo: { ...base.processo, ...(p.processo || {}), especialidades: (p.processo?.especialidades || []).map((e) => ({ id: uid(), modalidade: 'RQE', ...e })) },
    fontes: { ...(p.fontes || {}) },
    premissas: { ...base.premissas, ...(p.premissas || {}) },
    indiretos: { ...base.indiretos, ...(p.indiretos || {}) },
    simulador: { ...base.simulador, ...(p.simulador || {}) },
    tr: (p.tr || []).map((x) => ({ ...newTrItem(), ...x })),
    itens: (p.itens || []).map((x) => ({ ...newItem(), ...x })),
    concorrentes: (p.concorrentes || []).map((x) => ({ ...newConcorrente(), ...x })),
  }
}

export function duplicate(p) {
  const now = new Date().toISOString()
  const d = normalize(JSON.parse(JSON.stringify(p)))
  d.id = uid()
  d.createdAt = now
  d.updatedAt = now
  d.processo.descritivo = (p.processo.descritivo || 'Sem descritivo') + ' (cópia)'
  d.tr = d.tr.map((x) => ({ ...x, id: uid() }))
  d.itens = d.itens.map((x) => ({ ...x, id: uid() }))
  d.concorrentes = d.concorrentes.map((x) => ({ ...x, id: uid() }))
  return d
}

// Campos da aba Processo, agrupados por seção
export const PROCESSO_SECTIONS = [
  {
    id: 'identificacao',
    title: 'Identificação',
    fields: [
      { key: 'descritivo', label: 'Descritivo', hint: 'Cidade UF - PE nn aaaa - Abertura dd mm aaaa', type: 'text', wide: true },
      { key: 'municipio', label: 'Município/UF', type: 'text' },
      { key: 'orgao', label: 'Órgão contratante', type: 'text' },
      { key: 'orgaoCnpj', label: 'CNPJ do órgão', type: 'text' },
      { key: 'capital', label: 'Capital do estado', type: 'text' },
      { key: 'distancia', label: 'Distância da capital (km)', type: 'int' },
      { key: 'habitantes', label: 'Nº de habitantes', type: 'int' },
      { key: 'jaParticipamos', label: 'Já participamos nesta cidade?', type: 'select', list: 'SimNao' },
      { key: 'empresa', label: 'Empresa participante', type: 'select', list: 'Empresa' },
      { key: 'modalidade', label: 'Modalidade', type: 'select', list: 'Modalidade' },
      { key: 'numeroEdital', label: 'Nº do edital / processo', type: 'text' },
      { key: 'linkProcesso', label: 'Link do processo (PNCP / portal)', type: 'url' },
      { key: 'dataSessao', label: 'Data da sessão', type: 'date' },
      { key: 'horaSessao', label: 'Horário da sessão', type: 'time' },
      { key: 'tipoLicitacao', label: 'Tipo de licitação (critério)', type: 'select', list: 'TipoLicitacao' },
      { key: 'modoDisputa', label: 'Modo de disputa', type: 'select', list: 'ModoDisputa' },
      { key: 'objeto', label: 'Objeto resumido', type: 'textarea', wide: true },
      { key: 'local1', label: 'Local de execução', type: 'text' },
      { key: 'local2', label: 'Local de execução 2', type: 'text' },
      { key: 'local3', label: 'Local de execução 3', type: 'text' },
      { key: 'local4', label: 'Local de execução 4', type: 'text' },
      { key: 'local5', label: 'Local de execução 5', type: 'text' },
    ],
  },
  {
    id: 'valores',
    title: 'Valores e prazos',
    fields: [
      { key: 'estimadoGlobal', label: 'Valor estimado global', type: 'money' },
      { key: 'vigencia', label: 'Vigência (meses)', type: 'int' },
      { key: '_estimadoMensal', label: 'Valor estimado mensal', type: 'computed', fmt: 'money' },
      { key: 'renovacao', label: 'Renovação', type: 'select', list: 'Renovacao' },
      { key: 'inicioContrato', label: 'Início previsto do contrato', type: 'date' },
    ],
  },
  {
    id: 'regras',
    title: 'Regras do edital',
    fields: [
      { key: 'garantiaProposta', label: 'Exige garantia de proposta?', type: 'select', list: 'SimNao' },
      { key: 'garantiaContratual', label: 'Exige garantia contratual?', type: 'select', list: 'SimNao' },
      { key: 'quadroCoord', label: 'Quadro de serviços indica coordenação / RT / diretor técnico?', type: 'select', list: 'SimNao' },
      { key: 'trCoord', label: 'Termo de referência indica coordenação / RT / diretor técnico?', type: 'select', list: 'SimNao' },
      { key: 'subcontratacao', label: 'Permite subcontratação?', type: 'select', list: 'Subcontratacao' },
      { key: 'pctSub', label: '% de subcontratação', type: 'percent' },
      { key: 'cooperativa', label: 'Permite cooperativa?', type: 'select', list: 'SimNao' },
      { key: 'os', label: 'Permite Organização Social?', type: 'select', list: 'SimNao' },
      { key: 'oscip', label: 'Permite OSCIP?', type: 'select', list: 'SimNao' },
      { key: 'consorcio', label: 'Permite consórcio?', type: 'select', list: 'SimNao' },
      { key: 'epi', label: 'Responsabilidade pelo fornecimento de EPI', type: 'select', list: 'EPI' },
      { key: 'alimentacao', label: 'Alimentação', type: 'select', list: 'EPI' },
    ],
  },
  {
    id: 'equipe',
    title: 'Equipe técnica',
    fields: [
      { key: 'descritivoEquipe', label: 'Descritivo da equipe técnica', type: 'textarea', wide: true },
      { key: 'exigeCursos', label: 'Exige cursos de extensão (ACLS/ATLS/PALS etc.)?', type: 'select', list: 'SimNao' },
      { key: 'quaisCursos', label: 'Quais cursos?', type: 'text' },
      { key: 'posGrad', label: 'Permite pós-graduação?', type: 'select', list: 'SimNao' },
      { key: 'especialistaTitulo', label: 'Médico especialista (somente título)?', type: 'select', list: 'SimNao' },
      { key: 'especialistaRQE', label: 'Médico especialista com RQE (registro no CRM)?', type: 'select', list: 'SimNao' },
    ],
  },
  {
    id: 'empresa',
    title: 'Empresa atual (contrato vigente)',
    fields: [
      { key: 'atualIdentificada', label: 'Empresa atual identificada?', type: 'select', list: 'SimNao' },
      { key: 'atualRazao', label: 'Razão social', type: 'text' },
      { key: 'atualCnpj', label: 'CNPJ', type: 'text' },
      { key: 'atualCidade', label: 'Cidade/UF', type: 'text' },
      { key: 'atualAdministrador', label: 'Administrador', type: 'text' },
      { key: 'atualPorte', label: 'Porte', type: 'select', list: 'Porte' },
      { key: 'atualContrato', label: 'Nº do contrato', type: 'text' },
      { key: 'atualValorGlobal', label: 'Valor global do contrato', type: 'money' },
      { key: 'vigContrato', label: 'Vigência do contrato (meses)', type: 'int' },
      { key: '_contratoMensal', label: 'Valor mensal do contrato', type: 'computed', fmt: 'money' },
      { key: '_vsContrato', label: 'Nosso faturamento mensal vs contrato atual', type: 'computed', fmt: 'pctSigned' },
      { key: 'atualItens', label: 'Itens / valores praticados', type: 'textarea', wide: true },
    ],
  },
  {
    id: 'pesquisa',
    title: 'Pesquisa de preço (valores a pagar)',
    fields: [
      { key: 'pesquisaResponsavel', label: 'Responsável pela informação', type: 'text' },
      { key: 'statusPesquisa', label: 'Status da pesquisa', type: 'select', list: 'StatusProc' },
      { key: 'pesquisaData', label: 'Data da pesquisa', type: 'date' },
      { key: 'pesquisaCidades', label: 'Cidades de referência', type: 'text' },
      { key: 'pesquisaObs', label: 'Observações / itens pesquisados', type: 'textarea', wide: true },
    ],
  },
  {
    id: 'comite',
    title: 'Comitê de precificação',
    fields: [
      { key: 'comiteDataPrevista', label: 'Data prevista', type: 'date' },
      { key: 'comiteDataOcorreu', label: 'Data em que ocorreu', type: 'date' },
      { key: 'statusComite', label: 'Status', type: 'select', list: 'StatusProc' },
      { key: 'decisao', label: 'Decisão', type: 'select', list: 'Decisao' },
      { key: 'comitePresentes', label: 'Quem compareceu?', type: 'text' },
      { key: 'comiteObs', label: 'Observações do comitê', type: 'textarea', wide: true },
    ],
  },
  {
    id: 'extras',
    title: 'Dados extras',
    fields: [{ key: 'extras', label: 'Anotações livres', type: 'textarea', wide: true }],
  },
]
