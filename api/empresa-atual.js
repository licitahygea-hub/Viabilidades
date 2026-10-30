// POST /api/empresa-atual
// Procura quem presta hoje o objeto licitado, usando apenas fontes públicas e gratuitas:
// 1) PNCP: contratos do órgão (pelo CNPJ) e busca por texto no município;
// 2) BrasilAPI (dados da Receita Federal) para completar porte, sede e administrador da empresa.
import { handler, fetchJSON, HttpError } from './_lib/common.js'

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const digits = (s) => String(s || '').replace(/\D/g, '')
const fmtCnpj = (d) => (d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d)

const SERVICO_MEDICO = /\bmedic(?:o|a|os|as)\b|\bplant(?:ao|oes|onista)|servicos? de saude|\bprofissionais? (?:medic|de saude)|atendimento medico|especialidades? medica|\bclinica medica/
const NAO_SERVICO = /\baquisi|\bmateria(?:l|is)\b|\bmedicamento|\binsumo|\bequipamento|\blocacao de (?:veiculo|imove)|\bobra|\breforma|\bgenero(?:s)? aliment|\bcombustiv/

// Contratos publicados pelo órgão nos últimos 4 anos (API de consulta do PNCP)
async function contratosDoOrgao(cnpj, erros) {
  const hoje = new Date()
  const janelas = []
  for (let i = 0; i < 4; i++) {
    const fim = new Date(hoje)
    fim.setDate(fim.getDate() - 365 * i)
    const ini = new Date(fim)
    ini.setDate(ini.getDate() - 364)
    janelas.push([ymd(ini), ymd(fim)])
  }
  const achados = []
  await Promise.all(
    janelas.map(async ([ini, fim]) => {
      for (let pagina = 1; pagina <= 4; pagina++) {
        try {
          const url = `https://pncp.gov.br/api/consulta/v1/contratos?dataInicial=${ini}&dataFinal=${fim}&cnpjOrgao=${cnpj}&pagina=${pagina}&tamanhoPagina=500`
          const r = await fetchJSON(url, { timeout: 25000 })
          for (const c of r?.data || []) {
            const obj = fold(c.objetoContrato)
            if (SERVICO_MEDICO.test(obj)) achados.push(c)
          }
          if (!r || pagina >= (r.totalPaginas || 1)) break
        } catch (e) {
          erros.push(`PNCP contratos ${cnpj} (${ini}–${fim}): ${e.message}`)
          break
        }
      }
    }),
  )
  return achados
}

// Busca por texto do portal PNCP: usada para descobrir os órgãos do município
async function orgaosPorBusca(termo, cidade, erros) {
  try {
    const url = `https://pncp.gov.br/api/search/?q=${encodeURIComponent(termo)}&tipos_documento=contrato&ordenacao=-data&pagina=1&tam_pagina=50&status=todos`
    const r = await fetchJSON(url, { timeout: 20000 })
    const cnpjs = new Map()
    for (const it of r?.items || []) {
      const textoItem = fold(Object.values(it).filter((v) => typeof v === 'string').join(' '))
      if (cidade && !textoItem.includes(fold(cidade))) continue
      const cand = digits(it.orgao_cnpj) || (String(it.item_url || it.numero_controle_pncp || '').match(/(\d{14})/) || [])[1]
      if (cand && cand.length === 14) cnpjs.set(cand, (cnpjs.get(cand) || 0) + 1)
    }
    return [...cnpjs.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  } catch (e) {
    erros.push(`PNCP busca "${termo}": ${e.message}`)
    return []
  }
}

async function dadosEmpresa(cnpj) {
  try {
    const d = await fetchJSON(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { timeout: 12000 })
    if (!d) return null
    const porteTxt = fold(d.porte || d.descricao_porte)
    const porte = d.opcao_pelo_mei ? 'MEI' : /micro/.test(porteTxt) || porteTxt === '01' ? 'ME' : /pequeno/.test(porteTxt) || porteTxt === '03' ? 'EPP' : porteTxt ? 'DEMAIS' : undefined
    const adm = (d.qsa || []).find((s) => /administrador/i.test(s.qualificacao_socio || '') || [49, 5, 16].includes(+s.codigo_qualificacao_socio))
    return {
      razaoSocial: d.razao_social,
      nomeFantasia: d.nome_fantasia || undefined,
      cidadeUf: d.municipio ? `${d.municipio}/${d.uf}` : undefined,
      porte,
      administrador: adm?.nome_socio || undefined,
      situacao: d.descricao_situacao_cadastral,
    }
  } catch {
    return null
  }
}

function pontuar(c, termos, hoje) {
  const obj = fold(c.objetoContrato)
  let s = 0
  if (/servicos? medic|prestacao de servicos? (?:de )?(?:profissionais? )?medic/.test(obj)) s += 4
  if (/plant(?:ao|oes)/.test(obj)) s += 2
  for (const t of termos) if (t && obj.includes(t)) s += 2
  if (NAO_SERVICO.test(obj)) s -= 6
  const fim = c.dataVigenciaFim ? new Date(c.dataVigenciaFim) : null
  const vigente = !!fim && fim >= hoje
  if (vigente) s += 5
  return { s, vigente, fim }
}

export default handler(async (body) => {
  const { objeto, municipio, orgaoCnpj, locais = [], especialidades = [] } = body
  const cidade = String(municipio || '').split(/[/-]/)[0].trim()
  if (!cidade && digits(orgaoCnpj).length !== 14) throw new HttpError(400, 'Preencha o município ou o CNPJ do órgão na aba Processo.')

  const erros = []
  const fontesConsultadas = ['PNCP (contratos publicados)']
  let orgaos = []
  if (digits(orgaoCnpj).length === 14) orgaos.push(digits(orgaoCnpj))
  if (cidade) {
    const extra = await orgaosPorBusca(`serviços médicos ${cidade}`, cidade, erros)
    for (const c of extra) if (!orgaos.includes(c)) orgaos.push(c)
  }
  orgaos = orgaos.slice(0, 4)

  const listas = await Promise.all(orgaos.map((c) => contratosDoOrgao(c, erros)))
  const contratos = listas.flat()

  // termos relevantes: especialidades e nomes dos locais de execução
  const termos = [
    ...especialidades.map((e) => fold(e).split(' ')[0]),
    ...locais.filter(Boolean).flatMap((l) => fold(l).split(/\s+/).filter((w) => w.length >= 5 && !/^(hospital|unidade|municipal|pronto|atendimento|saude|centro)$/.test(w))),
    ...fold(objeto).split(/\W+/).filter((w) => /^(urgencia|emergencia|pediatr|ortoped|obstetr|anestes|intensiv|cardiolog|psiquiatr|ambulatori|atencao|basica|primaria)/.test(w)),
  ]
  const hoje = new Date()

  // agrupa por fornecedor
  const porForn = new Map()
  const vistos = new Set()
  for (const c of contratos) {
    const chaveC = `${c.orgaoEntidade?.cnpj}-${c.anoContrato}-${c.sequencialContrato}`
    if (vistos.has(chaveC)) continue
    vistos.add(chaveC)
    const p = pontuar(c, termos, hoje)
    if (p.s < 2) continue
    const k = digits(c.niFornecedor) || fold(c.nomeRazaoSocialFornecedor)
    const g = porForn.get(k) || { contratos: [], best: null, score: -Infinity }
    g.contratos.push({ c, ...p })
    const rank = p.s * 1e10 + (p.fim ? p.fim.getTime() / 1000 : 0)
    if (!g.best || rank > g.bestRank) {
      g.best = { c, ...p }
      g.bestRank = rank
      g.score = p.s
    }
    porForn.set(k, g)
  }

  const grupos = [...porForn.values()].sort((a, b) => b.bestRank - a.bestRank).slice(0, 5)
  const enriquecidos = await Promise.all(grupos.slice(0, 3).map((g) => (digits(g.best.c.niFornecedor).length === 14 ? dadosEmpresa(digits(g.best.c.niFornecedor)) : null)))
  if (enriquecidos.some(Boolean)) fontesConsultadas.push('Receita Federal (BrasilAPI)')

  const candidatos = grupos.map((g, i) => {
    const { c, vigente, fim } = g.best
    const rf = enriquecidos[i] || {}
    const cnpjOrg = c.orgaoEntidade?.cnpj
    const ini = c.dataVigenciaInicio ? new Date(c.dataVigenciaInicio) : null
    const meses = ini && fim ? Math.max(1, Math.round((fim - ini) / (1000 * 60 * 60 * 24 * 30.44))) : null
    const recente = fim && hoje - fim < 1000 * 60 * 60 * 24 * 365
    const confianca = vigente && g.score >= 9 ? 'alta' : vigente || recente ? 'média' : 'baixa'
    const fontes = g.contratos
      .sort((a, b) => (b.fim?.getTime() || 0) - (a.fim?.getTime() || 0))
      .slice(0, 4)
      .map(({ c: x }) => ({
        titulo: `PNCP – contrato ${x.numeroContratoEmpenho || x.sequencialContrato}/${x.anoContrato} (${x.orgaoEntidade?.razaoSocial || 'órgão'})`,
        url: `https://pncp.gov.br/app/contratos/${x.orgaoEntidade?.cnpj}/${x.anoContrato}/${x.sequencialContrato}`,
      }))
    return {
      razaoSocial: rf.razaoSocial || c.nomeRazaoSocialFornecedor,
      cnpj: fmtCnpj(digits(c.niFornecedor)),
      cidadeUf: rf.cidadeUf,
      administrador: rf.administrador,
      porte: rf.porte,
      numeroContrato: c.numeroContratoEmpenho,
      valorGlobal: c.valorGlobal ?? c.valorInicial ?? null,
      vigenciaMeses: meses,
      vigenciaInicio: c.dataVigenciaInicio?.slice(0, 10),
      vigenciaFim: c.dataVigenciaFim?.slice(0, 10),
      objeto: (c.objetoContrato || '').slice(0, 500),
      vigente,
      confianca,
      justificativa: `${g.contratos.length} contrato(s) de serviços médicos com ${c.orgaoEntidade?.razaoSocial || 'o órgão'}${c.unidadeOrgao?.municipioNome ? ` (${c.unidadeOrgao.municipioNome}/${c.unidadeOrgao.ufSigla})` : ''}. ${vigente ? 'Contrato mais recente vigente.' : fim ? `Último contrato terminou em ${c.dataVigenciaFim.slice(0, 10).split('-').reverse().join('/')}; verifique aditivos.` : 'Vigência não informada no PNCP.'}${rf.situacao && rf.situacao !== 'ATIVA' ? ` Situação na Receita: ${rf.situacao}.` : ''}`,
      fontes: cnpjOrg ? fontes : [],
    }
  })

  let resumo
  if (!candidatos.length) {
    resumo = orgaos.length
      ? `Nenhum contrato de serviços médicos foi encontrado no PNCP para ${orgaos.length === 1 ? 'o órgão' : 'os órgãos'} pesquisado(s). O contrato pode não ter sido publicado no PNCP; use os links de pesquisa abaixo (portal da transparência, tribunal de contas e diários oficiais).`
      : 'Não foi possível identificar o órgão no PNCP. Preencha o CNPJ do órgão na aba Processo e busque de novo.'
  } else {
    const t = candidatos[0]
    resumo = `${t.razaoSocial} é a empresa mais provável${t.vigente ? ', com contrato vigente' : ''} (confiança ${t.confianca}). Confira o objeto e os aditivos nos links do PNCP antes de usar no comitê.`
  }

  return {
    resumo,
    candidatos,
    pncpEncontrados: contratos.length,
    orgaosPesquisados: orgaos.map(fmtCnpj),
    buscaWeb: false,
    avisos: erros.slice(0, 6),
    fontesConsultadas,
  }
})
