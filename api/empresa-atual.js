// POST /api/empresa-atual
// Procura quem presta hoje o objeto licitado no local de execução:
// 1) PNCP (contratos do órgão + busca textual), 2) Claude com busca e leitura na web
// (portais de transparência, TCEs, diários oficiais etc.), 3) devolve candidatos com fontes.
import { handler, claude, toolUse, fetchJSON, HttpError } from './_lib/common.js'


const MEDICO = /m[eé]dic|plant[aã]o|sa[uú]de|especialidad|cl[ií]nic|hospital|upa\b|pronto[ -]?atend|pronto[ -]?socorro|urg[eê]ncia|emerg[eê]ncia|psf|esf\b|aten[cç][aã]o (b[aá]sica|prim[aá]ria)/i

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const digits = (s) => String(s || '').replace(/\D/g, '')

function compactContrato(c) {
  const cnpjOrg = c.orgaoEntidade?.cnpj
  return {
    fornecedor: c.nomeRazaoSocialFornecedor,
    cnpjFornecedor: c.niFornecedor,
    objeto: (c.objetoContrato || '').slice(0, 400),
    valorGlobal: c.valorGlobal ?? c.valorInicial,
    vigenciaInicio: c.dataVigenciaInicio,
    vigenciaFim: c.dataVigenciaFim,
    orgao: c.orgaoEntidade?.razaoSocial,
    unidade: c.unidadeOrgao?.nomeUnidade,
    municipio: c.unidadeOrgao?.municipioNome,
    uf: c.unidadeOrgao?.ufSigla,
    numeroContrato: c.numeroContratoEmpenho,
    url: cnpjOrg && c.anoContrato && c.sequencialContrato ? `https://pncp.gov.br/app/contratos/${cnpjOrg}/${c.anoContrato}/${c.sequencialContrato}` : undefined,
  }
}

// Contratos publicados pelo órgão nos últimos anos (API de consulta do PNCP)
async function pncpContratosDoOrgao(cnpj, fetchImpl) {
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
  const erros = []
  await Promise.all(
    janelas.map(async ([ini, fim]) => {
      for (let pagina = 1; pagina <= 3; pagina++) {
        try {
          const url = `https://pncp.gov.br/api/consulta/v1/contratos?dataInicial=${ini}&dataFinal=${fim}&cnpjOrgao=${cnpj}&pagina=${pagina}&tamanhoPagina=500`
          const r = await fetchJSON(url, { timeout: 20000, fetchImpl })
          const data = r?.data || []
          data.filter((c) => MEDICO.test(c.objetoContrato || '')).forEach((c) => achados.push(compactContrato(c)))
          if (!r || pagina >= (r.totalPaginas || 1)) break
        } catch (e) {
          erros.push(`contratos ${ini}-${fim}: ${e.message}`)
          break
        }
      }
    }),
  )
  return { achados, erros }
}

// Busca textual do portal PNCP (a mesma usada no site)
async function pncpBusca(termo, fetchImpl) {
  const url = `https://pncp.gov.br/api/search/?q=${encodeURIComponent(termo)}&tipos_documento=contrato&ordenacao=-data&pagina=1&tam_pagina=30&status=todos`
  const r = await fetchJSON(url, { timeout: 15000, fetchImpl })
  const items = r?.items || []
  return items.map((it) => {
    const o = {}
    for (const [k, v] of Object.entries(it)) {
      if (v === null || v === '' || typeof v === 'object') continue
      o[k] = typeof v === 'string' ? v.slice(0, 300) : v
    }
    if (it.item_url) o.url = `https://pncp.gov.br/app${it.item_url.replace(/^\/compras/, '/editais')}`
    return o
  })
}

const TOOL = {
  name: 'registrar_empresa_atual',
  description: 'Registra o resultado da pesquisa sobre a empresa que presta hoje o serviço.',
  input_schema: {
    type: 'object',
    properties: {
      resumo: { type: 'string', description: 'Conclusão em 2 a 5 frases, dizendo o grau de certeza e o que falta confirmar.' },
      candidatos: {
        type: 'array',
        description: 'Empresas que prestam (ou prestaram por último) o serviço, da mais provável para a menos provável. Máximo 5.',
        items: {
          type: 'object',
          properties: {
            razaoSocial: { type: 'string' },
            cnpj: { type: 'string' },
            cidadeUf: { type: 'string', description: 'Sede da empresa, se encontrada' },
            administrador: { type: 'string', description: 'Sócio-administrador, se encontrado' },
            porte: { type: 'string', enum: ['MEI', 'ME', 'EPP', 'DEMAIS', 'O.S'] },
            numeroContrato: { type: 'string' },
            valorGlobal: { type: ['number', 'null'] },
            vigenciaMeses: { type: ['integer', 'null'] },
            vigenciaInicio: { type: 'string', description: 'AAAA-MM-DD' },
            vigenciaFim: { type: 'string', description: 'AAAA-MM-DD' },
            objeto: { type: 'string' },
            itensValores: { type: 'string', description: 'Itens e valores praticados (ex.: plantão 12h clínico R$ 1.500), se encontrados' },
            vigente: { type: 'boolean', description: 'true se o contrato parece vigente hoje' },
            confianca: { type: 'string', enum: ['alta', 'média', 'baixa'] },
            justificativa: { type: 'string' },
            fontes: { type: 'array', items: { type: 'object', properties: { titulo: { type: 'string' }, url: { type: 'string' } }, required: ['url'] } },
          },
          required: ['razaoSocial', 'confianca', 'fontes'],
        },
      },
      fontesConsultadas: { type: 'array', items: { type: 'string' }, description: 'Portais/bases consultados, inclusive os sem resultado' },
    },
    required: ['resumo', 'candidatos'],
  },
}

const SYSTEM = `Você é analista de inteligência de mercado em licitações de serviços médicos no Brasil.
Tarefa: descobrir qual empresa presta HOJE (contrato vigente) o serviço objeto da licitação, no local de execução informado.

Como pesquisar:
1. Comece pelos contratos do PNCP fornecidos (são dados oficiais). Verifique objeto, órgão, município e vigência.
2. Pesquise na web: portal da transparência do município/órgão (despesas, contratos, empenhos e pagamentos a fornecedores), Tribunal de Contas do estado (ex.: Tome Conta TCE-PE, LicitaCon TCE-RS, Painel TCE etc.), diários oficiais (municipal, AMUPE/associações de municípios, Querido Diário), compras.gov.br, portais de compras (BLL, BNC, Licitanet, Portal de Compras Públicas) e notícias. Procure termos como "contratação de empresa para prestação de serviços médicos", "plantões médicos", "extrato de contrato", "termo aditivo", "homologação".
3. Confirme o CNPJ e, se possível, dados da empresa (sede, sócio-administrador, porte) em fontes públicas.
4. Prefira o contrato mais recente e vigente; se só achar contratos antigos, diga isso.

Ao terminar, chame registrar_empresa_atual. Cada candidato precisa de fontes com URL que você realmente consultou. Não invente CNPJ, valores ou números de contrato: deixe em branco o que não encontrou.`

export default handler(async (body) => {
  const fetchImpl = (...a) => fetch(...a)
  const { objeto, municipio, orgao, orgaoCnpj, locais = [], especialidades = [], numeroEdital } = body
  if (!objeto && !municipio && !orgao) throw new HttpError(400, 'Preencha pelo menos o objeto e o município (ou o órgão) na aba Processo.')

  const cidade = String(municipio || '').split(/[/-]/)[0].trim()
  const cnpj = digits(orgaoCnpj)

  const fontesPNCP = []
  const erros = []
  const tarefas = []
  if (cnpj.length === 14) {
    tarefas.push(
      pncpContratosDoOrgao(cnpj, fetchImpl).then(({ achados, erros: e }) => {
        fontesPNCP.push(...achados.map((c) => ({ origem: 'PNCP contratos do órgão', ...c })))
        erros.push(...e)
      }),
    )
  }
  const termos = [cidade && `serviços médicos ${cidade}`, cidade && `plantão médico ${cidade}`].filter(Boolean)
  for (const t of termos) {
    tarefas.push(
      pncpBusca(t, fetchImpl)
        .then((items) => fontesPNCP.push(...items.map((i) => ({ origem: `PNCP busca "${t}"`, ...i }))))
        .catch((e) => erros.push(`busca "${t}": ${e.message}`)),
    )
  }
  await Promise.all(tarefas)

  // remove duplicados e limita o volume enviado à IA
  const vistos = new Set()
  const pncp = fontesPNCP
    .filter((c) => {
      const k = c.url || JSON.stringify(c)
      if (vistos.has(k)) return false
      vistos.add(k)
      return true
    })
    .slice(0, 60)

  const contexto = {
    objeto,
    municipio,
    orgao,
    cnpjOrgao: orgaoCnpj,
    locaisExecucao: locais.filter(Boolean),
    especialidades,
    numeroEdital,
    hoje: body.hoje || new Date().toISOString().slice(0, 10),
  }
  const userText = `Dados da licitação:\n${JSON.stringify(contexto, null, 2)}\n\nResultados do PNCP (${pncp.length}):\n${JSON.stringify(pncp, null, 1)}${erros.length ? `\n\nFalhas na consulta ao PNCP: ${erros.slice(0, 5).join('; ')}` : ''}\n\nDescubra a empresa que presta o serviço hoje e registre o resultado.`

  const webTools = [
    { type: 'web_search_20260318', name: 'web_search', max_uses: 10, user_location: { type: 'approximate', city: cidade || undefined, country: 'BR', timezone: 'America/Sao_Paulo' } },
    { type: 'web_fetch_20260318', name: 'web_fetch', max_uses: 8, max_content_tokens: 40000 },
  ]
  let tools = [...webTools, TOOL]
  const messages = [{ role: 'user', content: userText }]
  const inicio = Date.now()
  let forcar = false
  let resultado = null
  let usoWeb = true

  for (let i = 0; i < 8 && !resultado; i++) {
    if (Date.now() - inicio > 230_000) forcar = true
    let msg
    try {
      msg = await claude(
        {
          max_tokens: 8000,
          system: SYSTEM,
          tools: forcar ? [TOOL] : tools,
          tool_choice: forcar ? { type: 'tool', name: TOOL.name } : { type: 'auto' },
          messages,
        },
        { fetchImpl },
      )
    } catch (e) {
      // ferramentas de web indisponíveis para a organização: segue só com o PNCP
      if (usoWeb && /web_(search|fetch)|tool/i.test(e.message)) {
        usoWeb = false
        tools = [TOOL]
        forcar = true
        erros.push(`Busca na web indisponível: ${e.message}`)
        continue
      }
      throw e
    }
    const tu = toolUse(msg, TOOL.name)
    if (tu) {
      resultado = tu.input
      break
    }
    messages.push({ role: 'assistant', content: msg.content })
    if (msg.stop_reason === 'pause_turn') continue
    messages.push({ role: 'user', content: 'Registre agora o resultado chamando registrar_empresa_atual.' })
    forcar = true
  }
  if (!resultado) throw new HttpError(502, 'A pesquisa não chegou a um resultado. Tente novamente.')

  return {
    ...resultado,
    pncpEncontrados: pncp.length,
    buscaWeb: usoWeb,
    avisos: erros.slice(0, 8),
  }
})
