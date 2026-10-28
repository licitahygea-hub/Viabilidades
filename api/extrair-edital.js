// POST /api/extrair-edital
// Recebe o texto (por página) do edital e anexos e devolve os campos da aba Processo,
// cada um com a fonte (arquivo, página e trecho) para conferência.
import { handler, claude, toolUse, HttpError } from './_lib/common.js'
import { toolSchema } from '../shared/campos-edital.js'

const SYSTEM = `Você é analista de licitações de serviços médicos no Brasil (Lei 14.133/2021).
Leia o edital e os anexos e registre os dados pedidos chamando a ferramenta registrar_dados_edital.

Regras:
- Para cada campo, informe o arquivo, a página (marcador [p. N] que antecede o texto) e um trecho LITERAL curto que comprove o valor. Isso é usado para conferência, então o trecho precisa existir no documento.
- Use origem "documento" quando o valor estiver nos arquivos. Use origem "conhecimento" apenas para capital, distância da capital e população, que podem vir do seu conhecimento geral; nesses casos deixe arquivo e trecho vazios.
- Não invente. Se um campo não consta, omita-o. Se houver informações conflitantes entre edital e anexos, prefira a mais específica (TR/planilha) e cite-a; mencione o conflito em observacoes.
- Datas no formato AAAA-MM-DD; horário HH:MM; valores em número (ponto decimal, sem "R$").
- Para campos de lista (enum), escolha a opção mais próxima; "Não informado" quando o edital não tratar do assunto mas o campo for relevante.
- Se o edital tiver vários lotes, use os dados do lote de serviços médicos principal e explique em observacoes.
- Especialidades: liste cada especialidade médica exigida, com o nome oficial do CFM quando possível (ex.: "Pediatria", "Ortopedia e Traumatologia", "Clínica Médica"). Para médico generalista/clínico sem exigência de especialidade use "Clínica Médica" com modalidade "Não especificado" só se o edital pedir clínico; caso não peça especialista, use "Não especificado".
- itensTR: transcreva o quadro de itens/serviços (profissional, local, carga, quantidade e valores), convertendo a carga para uma das bases da lista.`


export default handler(async (body) => {
  const textos = Array.isArray(body.textos) ? body.textos : []
  const pdfs = Array.isArray(body.pdfs) ? body.pdfs.slice(0, 1) : []
  if (!textos.some((t) => t.paginas?.some((p) => p.texto?.trim())) && !pdfs.length) {
    throw new HttpError(400, 'Nenhum texto encontrado nos documentos. Se forem PDFs digitalizados (imagem), envie um arquivo menor que 3 MB ou a versão pesquisável.')
  }

  const content = []
  for (const pdf of pdfs) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.base64 }, title: pdf.nome })
  }
  const partes = textos.map((t) => {
    const pags = (t.paginas || []).map((p) => (p.n ? `[p. ${p.n}]\n${p.texto}` : p.texto)).join('\n\n')
    return `<documento arquivo="${String(t.nome).replace(/"/g, "'")}">\n${pags}\n</documento>`
  })
  content.push({
    type: 'text',
    text: `${partes.join('\n\n')}\n\nExtraia os dados e chame registrar_dados_edital.${body.hoje ? ` Data de hoje: ${body.hoje}.` : ''}`,
  })

  const tool = toolSchema()
  const msg = await claude({
    max_tokens: 16000,
    system: SYSTEM,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content }],
  })
  const tu = toolUse(msg, tool.name)
  if (!tu) throw new HttpError(502, 'A IA não retornou os dados no formato esperado. Tente novamente.')
  return {
    ...tu.input,
    modelo: msg.model,
    uso: msg.usage,
    truncado: msg.stop_reason === 'max_tokens',
  }
})
