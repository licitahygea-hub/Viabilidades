// Persistência local (navegador) + processo de exemplo
import { CAMPOS, acharCampo } from '../config/regras.js'
import { grupoConcorrentes, grupoItens } from './calculos.js'

const CHAVE = 'viabilidade.processos.v1'

export const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const dados = JSON.parse(bruto)
      if (Array.isArray(dados?.processos)) return dados
    }
  } catch { /* navegador sem armazenamento: segue com o exemplo */ }
  return { processos: [processoExemplo()], atualId: null }
}

export function salvar(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
    return true
  } catch {
    return false
  }
}

// Premissas da empresa: copia do processo mais recente, ou usa os exemplos da planilha
export function novoProcesso(base) {
  const valores = {}
  for (const c of CAMPOS.filter((x) => x.bloco === 'Premissas' && !x.repete)) {
    if (base?.valores?.[c.id] !== undefined) valores[c.id] = base.valores[c.id]
    else if (/%$/.test(c.exemplo)) valores[c.id] = Number(c.exemplo.replace('%', '').replace(',', '.')) / 100
  }
  const reajInd = acharCampo('Premissas', 'reajuste-dos-custos-indiretos')
  if (reajInd) delete valores[reajInd.id]
  return { id: novoId(), criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), valores, grupos: {} }
}

function preencher(proc, bloco, prefixo, valor) {
  const c = acharCampo(bloco, prefixo)
  if (c && valor !== undefined) proc.valores[c.id] = valor
}

function linhaDe(pares) {
  const r = { _id: novoId() }
  for (const [bloco, prefixo, valor] of pares) {
    const c = acharCampo(bloco, prefixo)
    if (c && valor !== undefined && valor !== '') r[c.id] = valor
  }
  return r
}

// Dados reais do PE 037/2026 FAMESP (planilha de viabilidade de Botucatu/SP)
export function processoExemplo() {
  const p = { id: novoId(), exemplo: true, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), valores: {}, grupos: {} }
  const P = (prefixo, v) => preencher(p, 'Processo', prefixo, v)
  P('municipio-uf', 'Botucatu/SP')
  P('capital-do-estado', 'São Paulo')
  P('modalidade', 'Pregão Eletrônico')
  P('n-do-edital', 'PE 037/2026-FAMESP/HC · Proc. 52752/2026')
  P('data-da-sessao', '2026-11-06')
  P('horario-da-sessao', '09:00')
  P('tipo-de-licitacao', 'Menor Preço por Item')
  P('modo-de-disputa', 'Aberto')
  P('objeto-resumido', 'Plantões médicos de urgência e emergência pediátrica (PSP e PSRP) do HCFMB — 3 itens, 12 meses')
  P('local-de-execucao-1', 'PSP — Pronto Socorro Pediátrico (Av. Prof. Mário Rubens Guimarães Montenegro, s/n, Rubião Júnior, Botucatu/SP)')
  P('local-de-execucao-2', 'PSRP — Pronto Socorro Referenciado Pediátrico do HCFMB (mesmo endereço)')
  P('vigencia-do-contrato', 12)
  P('itens-valores-praticados', 'PSP: Pasquim (PJ de 1 médica generalista) R$ 850/plantão 6h = R$ 141,67/h (NFS-e jan-fev/2026). PSRP: SPC 002/2024 — Da Vinci Gestão em Saúde R$ 2.292/plantão.')
  P('status-da-pesquisa', 'Concluído')
  P('observacoes-itens-pesquisados', 'Valor-hora a pagar para pediatra / generalista c/ PALS em Botucatu e região (Bauru, Avaré, Jaú, Sorocaba).')
  P('vigencia-meses', 12)
  P('renovacao', 'Até 5 anos')
  P('status', 'Pendente')
  P('decisao', 'Pendente')
  P('exige-garantia-de-proposta', 'Não')
  P('exige-garantia-contratual', 'Sim')
  P('quadro-de-servicos', 'Não')
  P('termo-de-referencia', 'Sim')
  P('permite-subcontratacao', 'Não')
  P('permite-cooperativa', 'Não informado')
  P('permite-organizacao-social', 'Não informado')
  P('permite-oscip', 'Não informado')
  P('permite-consorcio', 'Não')
  P('responsabilidade-pelo-fornecimento-de-epi', 'Contratada')
  P('alimentacao', 'Por conta da contratada (cl. obrigações 1.11)')
  P('exige-cursos', 'Sim')
  P('permite-pos-graduacao', 'Não informado')
  P('medico-especialista-somente', 'Não')
  P('medico-especialista-com-rqe', 'Não')

  const R = (prefixo, v) => preencher(p, 'Premissas', prefixo, v)
  R('iss-com', 0.05); R('iss-sem', 0.02); R('status-da-consulta-iss', 'Confirmado')
  R('pis', 0.0065); R('cofins', 0.03); R('csll', 0.0108); R('ir', 0.02)
  R('reajuste-do-faturamento', 0.05); R('reajuste-do-valor-pago', 0.025); R('margem-minima', 0.06)

  const item = (prof, local, carga, base, qtd) =>
    linhaDe([
      ['TR', 'profissional', prof], ['TR', 'local', local], ['TR', 'carga-informada', carga],
      ['TR', 'base-da-carga', base], ['TR', 'qtd-informada', qtd], ['TR', 'n-de-profissionais', 1],
      ['Margem', 'unidade', 'Hora'], ['Margem', 'valor-unit-estimado', 'Sigiloso'],
      ['Margem', 'valor-unit-proposto', 175], ['Margem', 'valor-unit-a-pagar', 141.66],
    ])
  p.grupos[grupoItens] = [
    item('Médico Emergencista Pediatria - Plantão 12h (PSP)', 'PSP', '2.920 plantões de 12h/ano — diurno e noturno, seg-dom (1 médico/plantão)', 'plantões 12h/mês', '=2920/12'),
    item('Médico Emergencista Pediatria - Plantão 6h (PSP)', 'PSP', '365 plantões de 6h/ano — horários específicos (a princípio 18h–24h), seg-dom', 'h/mês', '=365*6/12'),
    item('Médico Emergencista Pediatria - Plantão 12h (PSRP)', 'PSRP', '1.219 plantões de 12h/ano — diurno e noturno, seg-dom (1 médico/plantão)', 'plantões 12h/mês', '=1219/12'),
  ]
  p.grupos[grupoConcorrentes] = []
  return p
}
