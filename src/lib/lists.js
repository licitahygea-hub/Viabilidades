// Listas de validação (aba "Listas" da planilha). Para incluir uma opção, acrescente ao array.
export const LISTS = {
  Modalidade: ['Pregão Eletrônico', 'Pregão Presencial', 'Concorrência', 'Dispensa de Licitação', 'Emergencial', 'Credenciamento', 'Coleta de Preço', 'Tomada de Preço'],
  Empresa: ['Agile', 'Atena', 'Atmed', 'Deltamed', 'Gaia', 'Hera', 'Hygea', 'Inframed', 'Prohealth', 'Royalmed', 'Supramed'],
  Porte: ['MEI', 'ME', 'EPP', 'DEMAIS', 'O.S'],
  TipoLicitacao: ['Menor Preço', 'Menor Preço Unitário', 'Menor Preço Global', 'Menor Preço por Lote', 'Menor Preço por Item', 'Maior Desconto', 'Empreitada por item unitário', 'Técnica e Preço'],
  ModoDisputa: ['Aberto', 'Aberto e fechado', 'Fechado', 'Não informado'],
  SimNao: ['Sim', 'Não', 'Não informado'],
  Subcontratacao: ['Sim', 'Não', 'Parcial', 'Somente c/ autorização', 'Não informado'],
  Renovacao: ['Até 06 meses', 'Até 12 meses', 'Até 24 meses', 'Até 5 anos', 'Até 10 anos', 'Período por igual', 'Ata Reg. Preço'],
  EPI: ['Contratante', 'Contratada', 'Não informado'],
  StatusProc: ['Pendente', 'Em andamento', 'Concluído'],
  StatusISS: ['Pendente', 'Confirmado'],
  Decisao: ['Participar', 'Não participar', 'Pendente'],
  StatusConc: ['Vencedor', 'Habilitado', 'Inabilitado', 'Desclassificado', 'Em análise'],
  Unidade: ['Hora', 'Plantão 12h', 'Plantão 24h', 'Consulta', 'Mensal'],
  BaseCarga: ['h/mês', 'h/dia', 'h/semana', 'plantões 12h/mês', 'plantões 24h/mês'],
}

// Regra de conversão (POP) da aba TR
export const BASE_FACTOR = {
  'h/mês': 1,
  'h/dia': 365 / 12,
  'h/semana': 52 / 12,
  'plantões 12h/mês': 12,
  'plantões 24h/mês': 24,
}
